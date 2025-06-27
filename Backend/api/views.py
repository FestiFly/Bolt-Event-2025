from django.http import JsonResponse
from rest_framework.decorators import api_view
import praw, requests
from textblob import TextBlob
import os
import requests
from datetime import datetime
import re
from django.views.decorators.csrf import csrf_exempt
from pymongo import MongoClient
import json
import copy
from pymongo.errors import PyMongoError
import google.generativeai as genai
from bson.objectid import ObjectId
import time 
from duckduckgo_search import DDGS
from bs4 import BeautifulSoup
import time
import random
import jwt
from django.conf import settings
from datetime import datetime, timedelta

# If SECRET_KEY isn't defined elsewhere, add this
SECRET_KEY = 'FetiFly' 
# MongoDB setup
client = MongoClient('mongodb+srv://ihub:akash@ihub.fel24ru.mongodb.net/')
db = client['festifly']
festival_collection = db['festivals']


# -------------------------------------------------- Utilities -------------------------------------------------
# Set up Reddit API client
reddit = praw.Reddit(
    client_id="3VH_mH98qrCYqfsi7U959A",
    client_secret="fjqtjosj1j9b5spWZ8YgUQ8N5NNbJw",
    user_agent="festifly-agent"
)

# Gemini setup
genai.configure(api_key="AIzaSyBcfcI8WFa798JtYaPpvxR94AYPz3LiVPM    ")
model = genai.GenerativeModel("gemini-2.0-flash")

HEYGEN_API_KEY = "NWM0NzA2YTgxY2Q3NDgwM2JkYjIzZDBkMGYyNjk0NjgtMTc1MDkyMDY1OA=="

# Connect to MongoDB
client = MongoClient('mongodb+srv://ihub:akash@ihub.fel24ru.mongodb.net/')
db = client['festifly']
festival_collection = db['festivals']

# You can expand this to include more search sources
SEARCH_SOURCES = ["festivals", "events", "concerts", "cultural events"]

# For Reddit reviews (still used in fetch_reddit_reviews_by_id)
RELEVANT_SUBREDDITS = ["Festivals", "IndiaTravel", "travel", "backpacking", "festival_culture"]

# Headers for web scraping
HEADERS = {"User-Agent": "FestiflyBot/0.1"}

# Simple in-memory cache for search results
SEARCH_CACHE = {}
CACHE_EXPIRY_MINUTES = 30

def clean_cache():
    """Clean expired cache entries"""
    current_time = datetime.utcnow()
    expired_keys = []
    
    for key, data in SEARCH_CACHE.items():
        time_diff = (current_time - data['timestamp']).total_seconds() / 60
        if time_diff >= CACHE_EXPIRY_MINUTES:
            expired_keys.append(key)
    
    for key in expired_keys:
        del SEARCH_CACHE[key]
    
    if expired_keys:
        print(f"Cleaned {len(expired_keys)} expired cache entries")

def get_post_vibe(permalink):
    try:
        post_id = permalink.split("/comments/")[1].split("/")[0]
        submission = reddit.submission(id=post_id)
        submission.comments.replace_more(limit=0)
        comments = [comment.body for comment in submission.comments[:10]]
        if not comments:
            return None
        scores = [TextBlob(comment).sentiment.polarity for comment in comments]
        return round(sum(scores) / len(scores), 2)
    except Exception as e:
        print(f"Error calculating vibe for {permalink}: {e}")
        return None

def fetch_duckduckgo_festivals(location, interests, month):
    """
    Fetch detailed festival data by scraping individual event pages for comprehensive information
    """
    results = []
    seen_urls = set()

    def extract_detailed_event_info(event_url, location, month):
        """Extract detailed information from individual event pages with enhanced parsing"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Referer': 'https://www.google.com/',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
            }
            
            response = requests.get(event_url, headers=headers, timeout=15, allow_redirects=True)
            if response.status_code != 200:
                return None
                
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            # Try to extract structured data first (JSON-LD, microdata)
            structured_data = extract_structured_data(soup)
            if structured_data:
                return structured_data
            
            # Extract title with enhanced strategies
            title = None
            title_selectors = [
                # Common event page title patterns
                'h1[class*="event"]', 'h1[class*="title"]', 'h1[class*="name"]',
                '.event-title h1', '.event-header h1', '.page-title h1',
                '[data-testid*="title"] h1', '[data-testid*="name"] h1',
                # Generic but specific selectors
                'h1', 'h2.event-title', '.event-name', '.title', 
                '[class*="event-title"]', '[class*="event-name"]',
                '[id*="title"]', '[id*="name"]',
                # Meta tags as fallback
                'meta[property="og:title"]', 'meta[name="twitter:title"]',
                'title'
            ]
            
            for selector in title_selectors:
                if selector.startswith('meta'):
                    title_elem = soup.select_one(selector)
                    if title_elem and title_elem.get('content', '').strip():
                        title = title_elem.get('content').strip()
                        break
                else:
                    title_elem = soup.select_one(selector)
                    if title_elem and title_elem.get_text(strip=True):
                        title_text = title_elem.get_text(strip=True)
                        # Filter out obvious navigation or generic titles
                        if len(title_text) > 5 and not any(skip in title_text.lower() for skip in ['home', 'menu', 'search', 'login', 'signup']):
                            title = title_text
                            break
            
            # Extract event description/content with enhanced logic
            content = ""
            content_selectors = [
                # Specific event content selectors
                '.event-description', '.event-details', '.event-content',
                '.description', '.content', '.about', '.summary',
                '.event-info', '.details', '.info',
                '[class*="description"]', '[class*="content"]', '[class*="about"]',
                '[class*="details"]', '[class*="info"]',
                # Generic content areas
                '.main-content p', '.content-area p', 'article p',
                '.event-body', '.post-content', '.entry-content',
                # Fallback to any substantial paragraphs
                'p'
            ]
            
            content_found = False
            for selector in content_selectors:
                if content_found:
                    break
                    
                content_elems = soup.select(selector)
                if content_elems:
                    content_texts = []
                    for elem in content_elems[:5]:  # Check more elements
                        text = elem.get_text(strip=True)
                        # Enhanced content filtering
                        if (len(text) > 30 and 
                            not any(skip in text.lower() for skip in ['cookie', 'privacy', 'terms', 'subscribe', 'newsletter']) and
                            (any(keyword in text.lower() for keyword in ['event', 'festival', 'celebration', 'experience', 'join', 'attend', 'participate', 'enjoy', 'discover', 'explore']) or
                             len(text) > 100)):  # Accept longer texts even without keywords
                            content_texts.append(text)
                            
                    if content_texts:
                        content = " ".join(content_texts[:2])[:800]  # Increased content length
                        content_found = True
                        break
            
            # Extract date/month information with enhanced patterns
            date_info = ""
            date_selectors = [
                '.date', '.event-date', '.datetime', '.when', '.schedule',
                '[class*="date"]', '[class*="time"]', '[class*="when"]',
                '[class*="schedule"]', '[data-testid*="date"]',
                'time', '[datetime]', '.calendar', '.event-time'
            ]
            
            months_pattern = r'\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b'
            
            for selector in date_selectors:
                date_elems = soup.select(selector)
                for elem in date_elems:
                    date_text = elem.get_text(strip=True)
                    # Check for datetime attribute
                    datetime_attr = elem.get('datetime', '')
                    
                    if datetime_attr and re.search(months_pattern, datetime_attr, re.IGNORECASE):
                        date_info = datetime_attr
                        break
                    elif date_text and (re.search(months_pattern, date_text, re.IGNORECASE) or 
                                       any(month_part in date_text.lower() for month_part in [month.lower()[:3], month.lower()])):
                        date_info = date_text
                        break
                        
                if date_info:
                    break
            
            # Extract location information with enhanced accuracy
            location_info = location  # Default to input location
            location_selectors = [
                '.location', '.venue', '.address', '.where', '.place',
                '[class*="location"]', '[class*="venue"]', '[class*="address"]',
                '[class*="place"]', '[data-testid*="location"]', '[data-testid*="venue"]',
                '.event-location', '.event-venue', '.event-address'
            ]
            
            for selector in location_selectors:
                location_elems = soup.select(selector)
                for elem in location_elems:
                    loc_text = elem.get_text(strip=True)
                    # Enhanced location validation
                    if (len(loc_text) > 5 and 
                        (location.lower() in loc_text.lower() or 
                         any(city_part in loc_text.lower() for city_part in location.lower().split()) or
                         len(loc_text) > 15)):  # Accept longer location descriptions
                        location_info = loc_text
                        break
                        
                if location_info != location:
                    break
            
            # Extract price information if available
            price_info = ""
            price_selectors = [
                '.price', '.cost', '.fee', '[class*="price"]', '[class*="cost"]',
                '[class*="fee"]', '.ticket-price', '.event-price'
            ]
            
            for selector in price_selectors:
                price_elem = soup.select_one(selector)
                if price_elem:
                    price_text = price_elem.get_text(strip=True)
                    if price_text and ('₹' in price_text or '$' in price_text or 'free' in price_text.lower() or 'rs' in price_text.lower()):
                        price_info = price_text
                        break
            
            # Enhanced validation and return
            if title and len(title) > 3:
                # Ensure we have meaningful content
                if not content:
                    # Try to get any meaningful text from the page
                    main_content = soup.select_one('main, .main, #main, .content, #content')
                    if main_content:
                        all_text = main_content.get_text(strip=True)
                        # Extract first meaningful paragraph
                        sentences = [s.strip() for s in all_text.split('.') if len(s.strip()) > 20]
                        if sentences:
                            content = '. '.join(sentences[:3]) + '.'
                    
                    if not content:
                        content = f"Event details for {title} in {location_info}"
                
                result = {
                    'title': title[:200],  # Limit title length
                    'content': content[:800] if content else f"Event in {location_info}",
                    'location': location_info[:200],
                    'date_info': date_info[:100],
                    'extracted_from': event_url
                }
                
                if price_info:
                    result['price_info'] = price_info[:100]
                
                return result
                
        except Exception as e:
            print(f"Error extracting details from {event_url}: {e}")
            
        return None

    def extract_structured_data(soup):
        """Extract structured data from JSON-LD or microdata"""
        try:
            # Try JSON-LD first
            json_ld_scripts = soup.find_all('script', type='application/ld+json')
            for script in json_ld_scripts:
                try:
                    data = json.loads(script.string)
                    if isinstance(data, list):
                        data = data[0]
                    
                    if data.get('@type') in ['Event', 'Festival', 'MusicEvent', 'TheaterEvent']:
                        return {
                            'title': data.get('name', ''),
                            'content': data.get('description', '')[:800],
                            'location': format_location_from_structured(data.get('location', {})),
                            'date_info': format_date_from_structured(data.get('startDate', '')),
                            'extracted_from': 'structured_data'
                        }
                except json.JSONDecodeError:
                    continue
            
            # Try microdata
            event_items = soup.find_all(attrs={'itemtype': re.compile(r'.*Event.*')})
            for item in event_items:
                name = item.find(attrs={'itemprop': 'name'})
                description = item.find(attrs={'itemprop': 'description'})
                location_elem = item.find(attrs={'itemprop': 'location'})
                date_elem = item.find(attrs={'itemprop': 'startDate'})
                
                if name:
                    return {
                        'title': name.get_text(strip=True),
                        'content': description.get_text(strip=True)[:800] if description else '',
                        'location': location_elem.get_text(strip=True) if location_elem else '',
                        'date_info': date_elem.get('datetime', '') or date_elem.get_text(strip=True) if date_elem else '',
                        'extracted_from': 'microdata'
                    }
                    
        except Exception as e:
            print(f"Error extracting structured data: {e}")
            
        return None

    def format_location_from_structured(location_data):
        """Format location from structured data"""
        if isinstance(location_data, str):
            return location_data
        elif isinstance(location_data, dict):
            if 'name' in location_data:
                return location_data['name']
            elif 'address' in location_data:
                addr = location_data['address']
                if isinstance(addr, str):
                    return addr
                elif isinstance(addr, dict):
                    parts = []
                    for key in ['streetAddress', 'addressLocality', 'addressRegion']:
                        if key in addr:
                            parts.append(addr[key])
                    return ', '.join(parts) if parts else ''
        return ''

    def format_date_from_structured(date_str):
        """Format date from structured data"""
        if date_str:
            try:
                # Try to parse ISO date
                from datetime import datetime
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                return dt.strftime('%B %d, %Y')
            except:
                return date_str
        return ''

    def search_comprehensive_sources(location, month):
        """Search multiple comprehensive event sources with enhanced extraction"""
        all_events = []
        
        # Define comprehensive event sources with better targeting
        event_sources = [
            {
                'name': 'AllEvents.in',
                'urls': [
                    f"https://allevents.in/{location.lower().replace(' ', '-')}/festivals",
                    f"https://allevents.in/{location.lower().replace(' ', '-')}/events/{month.lower()}",
                    f"https://allevents.in/search?q={location}+{month}+festival"
                ],
                'result_selectors': ['.event-item', '.event-card', '.listing-item', 'article', '[class*="event"]', '.event-list-item']
            },
            {
                'name': 'BookMyShow',
                'urls': [
                    f"https://in.bookmyshow.com/{location.lower().replace(' ', '-')}/events",
                    f"https://in.bookmyshow.com/{location.lower().replace(' ', '-')}/events/festivals"
                ],
                'result_selectors': ['.event-card', '.listing', '[class*="event"]', '.card', '__event-tile']
            },
            {
                'name': 'Eventbrite',
                'urls': [
                    f"https://www.eventbrite.com/d/{location.lower().replace(' ', '-')}/festivals/",
                    f"https://www.eventbrite.com/d/{location.lower().replace(' ', '-')}/events/",
                    f"https://www.eventbrite.com/e/search/?q={location}+{month}+festival"
                ],
                'result_selectors': ['.event-card', '.search-result-card', '[class*="event"]', '.search-event-card']
            },
            {
                'name': 'Meetup',
                'urls': [
                    f"https://www.meetup.com/find/?keywords={location}+festivals+{month}",
                    f"https://www.meetup.com/{location.lower()}/events"
                ],
                'result_selectors': ['.event-listing', '.search-result', '[class*="event"]', '.event-card']
            },
            {
                'name': 'Insider.in',
                'urls': [
                    f"https://insider.in/{location.lower().replace(' ', '-')}/events",
                    f"https://insider.in/{location.lower().replace(' ', '-')}/festivals"
                ],
                'result_selectors': ['.event-card', '.listing-card', '[class*="event"]', '.event-item']
            },
            {
                'name': 'TicketGenie',
                'urls': [
                    f"https://www.ticketgenie.in/events/{location.lower()}",
                    f"https://www.ticketgenie.in/search?q={location}+festival"
                ],
                'result_selectors': ['.event-card', '.event-item', '[class*="event"]']
            },
            {
                'name': 'Paytm Insider',
                'urls': [
                    f"https://paytminsider.com/{location.lower()}/events",
                    f"https://paytminsider.com/events/festivals/{location.lower()}"
                ],
                'result_selectors': ['.event-card', '.event-tile', '[class*="event"]']
            },
            {
                'name': 'What\'s Hot',
                'urls': [
                    f"https://whatshotbengaluru.com/events/",  # For Bangalore - adjust per city
                    f"https://www.whatshot.in/{location.lower()}/events"
                ],
                'result_selectors': ['.event-card', '.event-item', '[class*="event"]']
            }
        ]
        
        for source in event_sources:
            try:
                print(f"Scraping {source['name']} for detailed event information...")
                
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Referer': 'https://www.google.com/',
                }
                
                for url in source['urls']:
                    try:
                        response = requests.get(url, headers=headers, timeout=20)
                        if response.status_code != 200:
                            continue
                            
                        soup = BeautifulSoup(response.content, 'html.parser')
                        
                        # Try different result selectors
                        events_found_this_url = 0
                        for selector in source['result_selectors']:
                            if events_found_this_url >= 8:  # Limit per URL
                                break
                                
                            event_elements = soup.select(selector)
                            
                            for element in event_elements:
                                if events_found_this_url >= 8:
                                    break
                                    
                                # Extract basic event info with enhanced logic
                                title_elem = element.select_one('h1, h2, h3, h4, h5, h6, .title, [class*="title"], [class*="name"], a[class*="event"], a[class*="link"]')
                                link_elem = element.select_one('a[href], .link[href]') or element.find_parent('a')
                                
                                # Also try to find links within the element
                                if not link_elem:
                                    all_links = element.find_all('a', href=True)
                                    for link in all_links:
                                        href = link.get('href', '')
                                        if href and ('event' in href or 'ticket' in href or len(href) > 10):
                                            link_elem = link
                                            break
                                
                                if title_elem and link_elem:
                                    title = title_elem.get_text(strip=True)
                                    event_url = link_elem.get('href', '')
                                    
                                    # Clean and validate URL
                                    if event_url.startswith('/'):
                                        from urllib.parse import urljoin
                                        event_url = urljoin(url, event_url)
                                    elif not event_url.startswith('http'):
                                        continue
                                    
                                    # Enhanced title validation
                                    if (title and event_url and len(title) > 3 and
                                        not any(skip in title.lower() for skip in ['login', 'signup', 'search', 'menu', 'home', 'contact', 'about']) and
                                        (any(keyword in title.lower() for keyword in ['festival', 'event', 'concert', 'show', 'exhibition', 'celebration', 'meet', 'workshop', 'conference']) or
                                         any(month_part in title.lower() for month_part in [month.lower(), month.lower()[:3]])) and
                                        event_url not in seen_urls):
                                        
                                        seen_urls.add(event_url)
                                        
                                        # Extract additional context from the card/element
                                        card_text = element.get_text(strip=True)
                                        
                                        # Look for date information in the card
                                        date_in_card = ""
                                        date_elem = element.select_one('.date, .time, [class*="date"], [class*="time"]')
                                        if date_elem:
                                            date_in_card = date_elem.get_text(strip=True)
                                        
                                        # Look for location in the card
                                        location_in_card = location
                                        location_elem = element.select_one('.location, .venue, [class*="location"], [class*="venue"]')
                                        if location_elem:
                                            location_in_card = location_elem.get_text(strip=True)
                                        
                                        # Extract detailed information from event page
                                        detailed_info = extract_detailed_event_info(event_url, location, month)
                                        
                                        if detailed_info and detailed_info.get('title'):
                                            # Use detailed info if extraction was successful
                                            event_data = {
                                                'title': detailed_info['title'],
                                                'url': event_url,
                                                'content': detailed_info['content'],
                                                'location': detailed_info['location'],
                                                'date_info': detailed_info.get('date_info', date_in_card),
                                                'source': source['name']
                                            }
                                            
                                            if detailed_info.get('price_info'):
                                                event_data['price_info'] = detailed_info['price_info']
                                            
                                            all_events.append(event_data)
                                            events_found_this_url += 1
                                            print(f"✓ Detailed extraction: {detailed_info['title'][:50]}...")
                                            
                                        else:
                                            # Fallback to basic info with enhanced content
                                            basic_content = card_text[:400]
                                            if date_in_card:
                                                basic_content += f" | Date: {date_in_card}"
                                            
                                            all_events.append({
                                                'title': title,
                                                'url': event_url,
                                                'content': basic_content,
                                                'location': location_in_card,
                                                'date_info': date_in_card,
                                                'source': source['name']
                                            })
                                            events_found_this_url += 1
                                            print(f"✓ Basic extraction: {title[:50]}...")
                                        
                                        if len(all_events) >= 25:  # Limit total events
                                            break
                                
                                if len(all_events) >= 25:
                                    break
                            
                            if len(all_events) >= 25:
                                break
                        
                        if len(all_events) >= 25:
                            break
                            
                    except Exception as e:
                        print(f"Error processing URL {url}: {e}")
                        continue
                
                time.sleep(2)  # Rate limiting between sources
                
            except Exception as e:
                print(f"Error scraping {source['name']}: {e}")
                continue
        
        return all_events

    def search_with_google_api_simulation(location, month):
        """Enhanced Google search simulation for comprehensive results"""
        events = []
        
        search_queries = [
            f"{location} {month} 2025 festivals events",
            f"{location} cultural festivals {month} 2025",
            f"{location} music festivals {month} 2025",
            f"{location} art exhibitions {month} 2025",
            f"events in {location} {month} 2025"
        ]
        
        for query in search_queries:
            try:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                }
                
                search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}&num=20"
                response = requests.get(search_url, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    soup = BeautifulSoup(response.content, 'html.parser')
                    search_results = soup.select('.g')
                    
                    for result in search_results[:8]:
                        title_elem = result.select_one('h3')
                        link_elem = result.select_one('a[href]')
                        snippet_elem = result.select_one('.st, .aCOpRe, [class*="snippet"]')
                        
                        if title_elem and link_elem:
                            title = title_elem.get_text(strip=True)
                            url = link_elem.get('href', '')
                            snippet = snippet_elem.get_text(strip=True) if snippet_elem else ""
                            
                            # Clean Google redirect URLs
                            if url.startswith('/url?q='):
                                url = url.split('/url?q=')[1].split('&')[0]
                            
                            if (title and url.startswith('http') and 
                                any(keyword in title.lower() for keyword in ['festival', 'event', 'concert', 'exhibition']) and
                                url not in seen_urls):
                                
                                seen_urls.add(url)
                                
                                # Try to extract detailed info from this page too
                                detailed_info = extract_detailed_event_info(url, location, month)
                                
                                if detailed_info:
                                    events.append({
                                        'title': detailed_info['title'],
                                        'url': url,
                                        'content': detailed_info['content'],
                                        'location': detailed_info['location'],
                                        'date_info': detailed_info.get('date_info', ''),
                                        'source': 'Google Search'
                                    })
                                else:
                                    events.append({
                                        'title': title,
                                        'url': url,
                                        'content': snippet,
                                        'location': location,
                                        'date_info': '',
                                        'source': 'Google Search'
                                    })
                
                time.sleep(3)  # Rate limiting
                
            except Exception as e:
                print(f"Google search failed for query '{query}': {e}")
                continue
        
        return events

    # Main execution
    print(f"Starting comprehensive event data collection for {location} in {month}...")
    
    # Phase 1: Comprehensive source scraping
    comprehensive_events = search_comprehensive_sources(location, month)
    
    # Phase 2: Google search for additional events
    google_events = search_with_google_api_simulation(location, month)
    
    # Combine all events
    all_events = comprehensive_events + google_events
    
    # Process events with AI for better quality and consistency
    print(f"Processing {len(all_events)} events with Gemini AI...")
    ai_processed_events = batch_process_events_with_ai(all_events, location, month, interests)
    
    # Use AI-processed events as final results
    results = ai_processed_events[:12]  # Limit to 12 best events

    # Enhanced fallback system if insufficient real data found
    if len(results) < 3:
        print(f"Insufficient AI-processed data found ({len(results)} events). Generating enhanced fallback data...")
        fallback_events = generate_enhanced_fallback_data(location, month, interests, len(results))
        
        # Process fallback events with AI too for consistency
        ai_processed_fallback = batch_process_events_with_ai(fallback_events, location, month, interests)
        results.extend(ai_processed_fallback)

    print(f"Successfully extracted {len(results)} events ({len(all_events)} from sources)")
    return results

def generate_enhanced_fallback_data(location, month, interests, existing_count):
    """Generate realistic fallback data when scraping fails"""
    
    # Enhanced event templates with realistic details
    event_templates = [
        {
            "title": f"{location} Cultural Festival {month} 2025",
            "content": f"Experience the vibrant cultural heritage of {location} through traditional performances, local cuisine, and artisan exhibitions. This annual festival celebrates the rich traditions and contemporary arts scene, featuring live music, dance performances, and interactive workshops for all ages.",
            "category": "cultural"
        },
        {
            "title": f"{month} Music Festival - {location}",
            "content": f"A spectacular music festival in {location} featuring local and international artists across multiple genres. Enjoy live performances, food stalls, and entertainment zones in a beautiful outdoor setting. Perfect for music lovers and families alike.",
            "category": "music"
        },
        {
            "title": f"{location} Food & Wine Festival",
            "content": f"Discover the culinary treasures of {location} at this premier food and wine festival. Sample dishes from renowned local chefs, attend cooking demonstrations, and enjoy wine tastings from regional vineyards. A paradise for food enthusiasts.",
            "category": "food"
        },
        {
            "title": f"Art & Craft Exhibition - {location}",
            "content": f"Explore contemporary and traditional art forms at {location}'s premier art exhibition. Featuring works from local and international artists, interactive installations, and craft workshops. A must-visit for art lovers and creative minds.",
            "category": "art"
        },
        {
            "title": f"{location} Film Festival {month}",
            "content": f"Celebrate cinema at the {location} Film Festival, showcasing independent films, documentaries, and international cinema. Features screenings, director Q&As, and workshops for aspiring filmmakers.",
            "category": "film"
        },
        {
            "title": f"Heritage Walk & Festival - {location}",
            "content": f"Discover the historical landmarks and heritage sites of {location} through guided walks and cultural performances. Learn about local history, architecture, and traditions while enjoying street food and live entertainment.",
            "category": "heritage"
        },
        {
            "title": f"{month} Night Market - {location}",
            "content": f"Experience the vibrant night life of {location} at this bustling night market. Shop for local crafts, enjoy street food, live music, and entertainment. A perfect evening out for families and friends.",
            "category": "market"
        },
        {
            "title": f"Wellness & Yoga Retreat - {location}",
            "content": f"Join a rejuvenating wellness retreat in the serene surroundings of {location}. Features yoga sessions, meditation workshops, healthy cuisine, and wellness talks by expert practitioners.",
            "category": "wellness"
        },
        {
            "title": f"{location} Tech & Innovation Summit",
            "content": f"Explore the latest in technology and innovation at this summit in {location}. Features keynote speakers, product demonstrations, networking sessions, and startup showcases.",
            "category": "tech"
        },
        {
            "title": f"Sports & Adventure Festival - {location}",
            "content": f"Get your adrenaline pumping at the {location} sports and adventure festival. Features extreme sports demonstrations, adventure activities, fitness workshops, and sports competitions for all skill levels.",
            "category": "sports"
        }
    ]
    
    # Filter events based on interests if provided
    if interests:
        filtered_templates = []
        for template in event_templates:
            if any(interest.lower() in template['category'].lower() or 
                   interest.lower() in template['title'].lower() or 
                   interest.lower() in template['content'].lower() 
                   for interest in interests):
                filtered_templates.append(template)
        
        if filtered_templates:
            event_templates = filtered_templates
    
    # Generate realistic URLs and additional details
    fallback_events = []
    needed_events = min(8, 10 - existing_count)  # Generate up to 8 fallback events
    
    for i in range(needed_events):
        template = event_templates[i % len(event_templates)]
        
        # Generate realistic details
        event_data = {
            "title": template["title"],
            "location": location,
            "tags": interests if interests else [template["category"]],
            "url": f"https://www.eventbrite.com/e/{location.lower().replace(' ', '-')}-{template['category']}-festival-{month.lower()}-{100000 + i}",
            "month": month,
            "content": template["content"],
            "fetched_at": datetime.utcnow(),
            "source": "Enhanced Fallback Data",
            "is_fallback": True
        }
        
        # Add realistic date info
        if month.lower() in ['january', 'jan']:
            event_data['date_info'] = f"January 15-17, 2025"
        elif month.lower() in ['february', 'feb']:
            event_data['date_info'] = f"February 12-14, 2025"
        elif month.lower() in ['march', 'mar']:
            event_data['date_info'] = f"March 8-10, 2025"
        elif month.lower() in ['april', 'apr']:
            event_data['date_info'] = f"April 18-20, 2025"
        elif month.lower() in ['may']:
            event_data['date_info'] = f"May 22-24, 2025"
        elif month.lower() in ['june', 'jun']:
            event_data['date_info'] = f"June 14-16, 2025"
        elif month.lower() in ['july', 'jul']:
            event_data['date_info'] = f"July 19-21, 2025"
        elif month.lower() in ['august', 'aug']:
            event_data['date_info'] = f"August 16-18, 2025"
        elif month.lower() in ['september', 'sep']:
            event_data['date_info'] = f"September 13-15, 2025"
        elif month.lower() in ['october', 'oct']:
            event_data['date_info'] = f"October 11-13, 2025"
        elif month.lower() in ['november', 'nov']:
            event_data['date_info'] = f"November 15-17, 2025"
        elif month.lower() in ['december', 'dec']:
            event_data['date_info'] = f"December 13-15, 2025"
        else:
            event_data['date_info'] = f"{month} 2025"
        
        fallback_events.append(event_data)
    
    print(f"Generated {len(fallback_events)} enhanced fallback events")
    return fallback_events

@csrf_exempt
def get_recommendations(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method is allowed."}, status=405)

    try:
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON body."}, status=400)

        location = data.get("location", "").strip()
        interests = data.get("interests", [])
        month = data.get("month", "").strip()

        if not location or not month:
            return JsonResponse({
                "error": "Both 'location' and 'month' are required fields."
            }, status=400)

        print(f"[{datetime.utcnow()}] Searching: location={location}, month={month}, interests={interests}")

        # Clean expired cache entries
        clean_cache()

        # Check cache first
        cache_key = f"{location.lower()}_{month.lower()}_{hash(tuple(sorted(interests)))}"
        current_time = datetime.utcnow()
        
        if cache_key in SEARCH_CACHE:
            cached_data = SEARCH_CACHE[cache_key]
            cache_time = cached_data['timestamp']
            time_diff = (current_time - cache_time).total_seconds() / 60
            
            if time_diff < CACHE_EXPIRY_MINUTES:
                print(f"Using cached results for {cache_key}")
                cached_festivals = cached_data['festivals']
                
                # Add new _id for each cached result since they're being inserted fresh
                try:
                    insert_result = festival_collection.insert_many(copy.deepcopy(cached_festivals))
                    for i, fest in enumerate(cached_festivals):
                        fest["_id"] = str(insert_result.inserted_ids[i])
                except PyMongoError as e:
                    print(f"MongoDB error: {str(e)}")
                
                return JsonResponse({"festivals": cached_festivals}, status=200)

        festivals = fetch_duckduckgo_festivals(location, interests, month)

        if not festivals or len(festivals) == 0:
            print(f"No festivals found for {location} in {month}. This should not happen with enhanced fallback.")
            return JsonResponse({
                "message": "No festivals found for the given filters.",
                "festivals": []
            }, status=200)

        # Cache the results - the AI-processed results from fetch_duckduckgo_festivals
        SEARCH_CACHE[cache_key] = {
            'festivals': copy.deepcopy(festivals),
            'timestamp': current_time
        }

        try:
            insert_result = festival_collection.insert_many(copy.deepcopy(festivals))
            for i, fest in enumerate(festivals):
                fest["_id"] = str(insert_result.inserted_ids[i])
        except PyMongoError as e:
            print(f"MongoDB error: {str(e)}")

        # Sort by title alphabetically
        festivals.sort(key=lambda x: x.get("title", "").lower())

        return JsonResponse({"festivals": festivals}, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)

@csrf_exempt
@api_view(["POST"])
def get_festival_by_id(request):
    try:
        body = json.loads(request.body)
        festival_id = body.get("_id")

        if not festival_id:
            return JsonResponse({"error": "_id is required"}, status=400)

        festival = festival_collection.find_one({"_id": ObjectId(festival_id)})
        if not festival:
            return JsonResponse({"error": "Festival not found"}, status=404)

        festival["_id"] = str(festival["_id"])  # Convert ObjectId to string for frontend
        return JsonResponse({"festival": festival}, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)

@csrf_exempt
@api_view(["POST"])
def fetch_reddit_reviews_by_id(request):
    try:
        data = json.loads(request.body)
        festival_id = data.get("_id")

        if not festival_id:
            return JsonResponse({"error": "_id is required"}, status=400)

        # Fetch festival from DB
        festival = festival_collection.find_one({"_id": ObjectId(festival_id)})
        if not festival:
            return JsonResponse({"error": "Festival not found in database."}, status=404)

        # ✅ Return early if already cached
        existing_reviews = festival.get("reddit_review", [])
        if existing_reviews:
            return JsonResponse({
                "message": "Reviews loaded from cache.",
                "reviews": existing_reviews
            }, status=200)

        # If not cached, generate search query
        title = festival.get("title", "")
        location = festival.get("location", "")
        month = festival.get("month", "")
        search_query = f"{title} {location} {month} festival"
        print(f"Reddit review query: {search_query}")

        comments_collected = []

        for subreddit in RELEVANT_SUBREDDITS:
            url = f"https://www.reddit.com/r/{subreddit}/search.json"
            params = {
                "q": search_query,
                "restrict_sr": "true",
                "sort": "top",
                "limit": 5,
                "t": "year"
            }

            res = requests.get(url, headers=HEADERS, params=params)
            if res.status_code != 200:
                continue

            posts = res.json().get("data", {}).get("children", [])
            for post in posts:
                post_data = post.get("data", {})
                permalink = post_data.get("permalink")

                if not permalink:
                    continue

                try:
                    post_id = permalink.split("/comments/")[1].split("/")[0]
                    submission = reddit.submission(id=post_id)
                    submission.comments.replace_more(limit=0)
                    top_comments = [comment.body for comment in submission.comments[:5]]

                    for comment_text in top_comments:
                        comments_collected.append({
                            "comment": comment_text,
                            "post_url": f"https://reddit.com{permalink}",
                            "score": TextBlob(comment_text).sentiment.polarity
                        })
                except Exception as e:
                    print(f"Error processing post: {e}")

        comments_collected.sort(key=lambda x: x["score"], reverse=True)

        # Save to DB under 'reddit_review'
        festival_collection.update_one(
            {"_id": ObjectId(festival_id)},
            {"$set": {"reddit_review": comments_collected}}  # 👈 use $set instead of $push
        )

        return JsonResponse({
            "message": "Reviews fetched and saved.",
            "reviews": comments_collected
        }, status=200)

    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)
    

@csrf_exempt
def smart_planner(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            # Required
            festival_name = data.get("festival_name")
            destination = data.get("destination")
            start_date = data.get("start_date")
            end_date = data.get("end_date")

            # Optional
            from_city = data.get("from_city", "your city")
            preferences = data.get("preferences", [])
            accessibility_needs = data.get("accessibility_needs", [])  # e.g., ["wheelchair", "sign_language"]
            include_real_time = data.get("include_real_time", False)  # Flag for real-time updates

            if not all([festival_name, destination, start_date, end_date]):
                return JsonResponse({"error": "Festival name, destination, start_date, and end_date are required."}, status=400)

            # 💬 AI Prompt
            prompt = f"""
You are a smart travel and event planning assistant.

Create a 3-4 day itinerary for a user attending the "{festival_name}" in {destination}.
The festival is from {start_date} to {end_date}. The user is traveling from {from_city}.
Preferences: {', '.join(preferences)}.
Accessibility Needs: {', '.join(accessibility_needs) if accessibility_needs else 'None'}.
{'Include real-time weather and event updates if available.' if include_real_time else ''}

Include:
- Suggested travel (flights or train)
- Accommodation options with accessibility details if needed
- Local transportation ideas
- Morning, afternoon, evening activity suggestions (with times and map coordinates)
- Nearby attractions or food spots
- A fun tip or highlight for each day
- Real-time weather forecast and event updates if requested
- Accessibility information for venues and transport if needed
- Interactive map data (venue coordinates, estimated crowd density)

Respond in this JSON format:

{{
  "itinerary": [
    {{
      "date": "YYYY-MM-DD",
      "morning": {{
        "activity": "description",
        "time": "HH:MM",
        "location": {{ "lat": float, "lng": float }},
        "accessibility": "details or None",
        "crowd_density": "low/medium/high"
      }},
      "afternoon": {{
        "activity": "description",
        "time": "HH:MM",
        "location": {{ "lat": float, "lng": float }},
        "accessibility": "details or None",
        "crowd_density": "low/medium/high"
      }},
      "evening": {{
        "activity": "description",
        "time": "HH:MM",
        "location": {{ "lat": float, "lng": float }},
        "accessibility": "details or None",
        "crowd_density": "low/medium/high"
      }},
      "tip": "fun tip for the day",
      "weather_forecast": "brief forecast or null",
      "event_updates": "update details or null"
    }},
    ...
  ],
  "travel": [
    {{
      "mode": "flight/train",
      "provider": "Airline/Rail name",
      "price_range": "₹xxx - ₹xxx",
      "accessibility": "details or None"
    }}
  ],
  "hotels": [
    {{
      "hotel_name": "Hotel Name",
      "price_range": "₹xxx - ₹xxx",
      "accessibility": "details or None",
      "location": {{ "lat": float, "lng": float }}
    }}
  ],
  "map_data": {{
    "festival_center": {{ "lat": float, "lng": float }},
    "key_locations": [
      {{ "name": "location name", "lat": float, "lng": float, "type": "stage/food/restroom" }}
    ]
  }}
}}

Only return valid JSON. No extra explanation or text.
"""

            def clean_ai_response(ai_response):
                cleaned = re.sub(r"^```[a-zA-Z]*\n?", "", ai_response.strip())
                cleaned = re.sub(r"\n?```$", "", cleaned)
                return json.loads(cleaned)

            response = model.generate_content(prompt)
            result_text = response.text.strip()

            try:
                result = clean_ai_response(result_text)
                return JsonResponse({"smart_itinerary": result}, status=200)
            except Exception as parse_error:
                return JsonResponse({
                    "error": "AI response could not be parsed.",
                    "raw": result_text,
                    "details": str(parse_error)
                }, status=500)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Only POST method allowed"}, status=405)

@csrf_exempt
def get_all_festivals(request):
    if request.method != "GET":
        return JsonResponse({"error": "Only GET method is allowed."}, status=405)

    try:
        festivals_cursor = festival_collection.find()
        festivals = []
        for fest in festivals_cursor:
            fest_copy = copy.deepcopy(fest)
            fest_copy["_id"] = str(fest_copy.get("_id", ""))
            festivals.append({
                "_id": fest_copy.get("_id"),
                "title": fest_copy.get("title"),
                "location": fest_copy.get("location"),
                "tags": fest_copy.get("tags"),
                "content": fest_copy.get("content"),
                "reddit_url": fest_copy.get("reddit_url"),
                "upvotes": fest_copy.get("upvotes"),
                "month": fest_copy.get("month"),
                "vibe_score": fest_copy.get("vibe_score"),
                "fetched_at": fest_copy.get("fetched_at")
            })

        return JsonResponse({"festivals": festivals}, status=200)

    except PyMongoError as e:
        return JsonResponse({"error": f"MongoDB error: {str(e)}"}, status=500)
    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)
    
#===============================================================Voice Assistant===========================================================@csrf_exempt
@csrf_exempt
@api_view(["POST"])
def generate_voice_briefing(request):
    try:
        import base64
        from bson.objectid import ObjectId
        
        # Verify user authentication and get user ID from token
        auth_header = request.headers.get('Authorization', '')
        user_id = None
        plan = None
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                user_id = payload.get("user_id")
                plan = payload.get("plan")  # Get user plan from token
            except:
                return JsonResponse({"error": "Invalid or expired token"}, status=401)
        else:
            return JsonResponse({"error": "Authorization token required"}, status=401)

        data = json.loads(request.body)
        festival_id = data.get("_id")
        language = data.get("language", "en").lower()

        if not festival_id:
            return JsonResponse({"error": "_id is required"}, status=400)

        # Fetch festival from DB
        fest = festival_collection.find_one({"_id": ObjectId(festival_id)})
        if not fest:
            return JsonResponse({"error": "Festival not found"}, status=404)

        # Check if language is allowed for the plan
        if language != "en" and not plan:
            return JsonResponse({
                "error": "Free users can only generate English voice briefings. Please upgrade to access other languages."
            }, status=403)

        # Get user's current voice usage count
        user = None
        if user_id:
            user = db['users'].find_one({"_id": ObjectId(user_id)})
            
            if user:
                # Check usage limits based on plan
                voice_usage = user.get('voice_usage', 0)
                
                if plan == 'yearly':
                    # Unlimited for yearly subscribers
                    pass
                elif plan == 'monthly' and voice_usage >= 5:
                    return JsonResponse({
                        "error": "You've reached your monthly limit of 5 voice generations. Please upgrade to our annual plan for unlimited access."
                    }, status=403)
                elif not plan and voice_usage >= 2:
                    return JsonResponse({
                        "error": "You've reached your free tier limit of 2 voice generations. Please upgrade to a premium plan."
                    }, status=403)

        # ✅ Return cached voice data if available
        voice_data = fest.get("ai_voice_data", {})
        if language in voice_data and all(k in voice_data[language] for k in ["script", "blob"]):
            # If authenticated and using cache, still increment usage for non-yearly users
            if user_id and plan != 'yearly' and user:
                db['users'].update_one(
                    {"_id": ObjectId(user_id)},
                    {"$inc": {"voice_usage": 1}}
                )
            
            # Return cached data
            return JsonResponse({
                "script": voice_data[language]["script"],
                "audio_url": voice_data[language].get("url"),
                "audio_blob": voice_data[language]["blob"]
            })

        # 🎙️ Language to Voice ID mapping
        VOICE_MAP_BY_LANG = {
            "en": "EXAVITQu4vr4xnSDxMaL",             # Rachel
            "ta": "gCr8TeSJgJaeaIoV4RWH",              # Priya
            "hi": "1qEiC6qsybMkmnNdVMbK",              # Rahul
        }
        voice_id = VOICE_MAP_BY_LANG.get(language, VOICE_MAP_BY_LANG["en"])

        # 🧠 Compose AI prompt
        reviews = fest.get("reddit_review", [])[:3]
        review_summary = "\n".join(f"- {r['comment']}" for r in reviews)

        prompt = f"""
        You're an AI assistant. Write a 30-second voice briefing about this festival.

        Title: {fest['title']}
        Location: {fest['location']}
        Month: {fest['month']}
        Vibe Score: {fest.get('vibe_score', 'N/A')}
        Description: {fest.get('content', '')}
        Reviews:
        {review_summary}

        Keep it natural, spoken, and friendly.
        """

        # Generate script via Gemini
        response = model.generate_content(prompt)
        script_en = response.text.strip()

        # 🌍 Translate if necessary
        final_script = script_en
        if language != "en":
            translate_url = "https://translate.googleapis.com/translate_a/single"
            params = {
                "client": "gtx",
                "sl": "en",
                "tl": language,
                "dt": "t",
                "q": script_en,
            }
            res = requests.get(translate_url, params=params)
            translated = res.json()[0]
            final_script = "".join([line[0] for line in translated])

        # 🎧 ElevenLabs TTS
        eleven_api_key = "sk_ef9305110b34246545463b96bea287d63816fd6c78398d6d"
        tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": eleven_api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "text": final_script,
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.7
            }
        }

        res = requests.post(tts_url, headers=headers, json=payload)
        if res.status_code != 200:
            return JsonResponse({"error": "Voice generation failed", "details": res.text}, status=500)

        # 💾 Save local mp3 (optional)
        filename = f"{festival_id}_{language}.mp3"
        audio_path = f"static/voices/{filename}"
        os.makedirs("static/voices", exist_ok=True)
        with open(audio_path, "wb") as f:
            f.write(res.content)

        # 🔐 Convert to base64
        audio_base64 = base64.b64encode(res.content).decode("utf-8")

        # 📦 Save in structured format
        festival_collection.update_one(
            {"_id": ObjectId(festival_id)},
            {"$set": {
                f"ai_voice_data.{language}": {
                    "script": final_script,
                    "url": f"/static/voices/{filename}",
                    "blob": audio_base64
                }
            }}
        )

        # Update user's voice usage count if not on yearly plan
        if user_id and plan != 'yearly' and user:
            db['users'].update_one(
                {"_id": ObjectId(user_id)},
                {"$inc": {"voice_usage": 1}}
            )

        return JsonResponse({
            "script": final_script,
            "audio_url": f"/static/voices/{filename}",
            "audio_blob": audio_base64
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

#=============================================================== Video Model ===========================================================

@csrf_exempt
@api_view(["POST"])
def generate_ai_video(request):
    try:
        import base64

        # Parse JSON body
        data = json.loads(request.body)
        festival_id = data.get("_id")
        language = data.get("language", "en").lower()

        if not festival_id:
            return JsonResponse({"error": "_id is required"}, status=400)

        # Fetch festival from DB
        fest = festival_collection.find_one({"_id": ObjectId(festival_id)})
        if not fest:
            return JsonResponse({"error": "Festival not found"}, status=404)

        # ✅ Check if video already exists
        video_data = fest.get("ai_video_data", {})
        if language in video_data and "url" in video_data[language]:
            return JsonResponse({
                "video_url": video_data[language]["url"],
                "script": video_data[language].get("script", "")
            })

        # 🧠 Try to get voice script from ai_voice_data
        voice_data = fest.get("ai_voice_data", {})
        script = voice_data.get(language, {}).get("script")

        # Fallback: Generate script using Gemini
        if not script:
            reviews = fest.get("reddit_review", [])[:3]
            review_summary = "\n".join(f"- {r['comment']}" for r in reviews)
            prompt = f"""
            You're an AI assistant. Write a 30-second voice briefing about this festival.

            Title: {fest['title']}
            Location: {fest['location']}
            Month: {fest['month']}
            Vibe Score: {fest.get('vibe_score', 'N/A')}
            Description: {fest.get('content', '')}
            Reviews:
            {review_summary}

            Keep it natural, spoken, and friendly.
            """
            script = model.generate_content(prompt).text.strip()

        # 🎯 Call Tavus API
        TAVUS_API_KEY = "f41d88f2ca6d46cc812c0e0e106df7ca"
        TEMPLATE_ID = "r89d84ea6160"

        tavus_url = f"https://api.tavus.io/v1/templates/{TEMPLATE_ID}/videos"
        headers = {
            "x-api-key": TAVUS_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "video": {
                "title": f"{fest['title']} AI Concierge",
                "input_text": script
            }
        }

        try:
            res = requests.post(tavus_url, headers=headers, json=payload, timeout=70)
            if res.status_code == 200:
                tavus_data = res.json()
                video_url = tavus_data.get("video_url") or tavus_data.get("url") or "PENDING"
            else:
                return JsonResponse({"error": "Tavus video generation failed", "details": res.text}, status=500)
        except requests.exceptions.RequestException as e:
            return JsonResponse({"error": "Tavus API connection error", "details": str(e)}, status=500)

        # Save in MongoDB
        festival_collection.update_one(
            {"_id": ObjectId(festival_id)},
            {"$set": {
                f"ai_video_data.{language}": {
                    "url": video_url,
                    "script": script
                }
            }}
        )

        return JsonResponse({
            "video_url": video_url,
            "script": script
        })

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
    

def process_with_gemini_ai(raw_event_data, location, month, interests):
    """
    Use Gemini AI to process and improve scraped event data for consistent database storage
    """
    try:
        # Prepare the prompt for Gemini
        prompt = f"""
        You are a data processing assistant for a festival/event discovery platform. 
        Process the following raw event data and return ONLY a valid JSON object in the exact format specified.

        Raw Event Data:
        Title: {raw_event_data.get('title', '')}
        Content: {raw_event_data.get('content', '')}
        Location: {raw_event_data.get('location', location)}
        Date Info: {raw_event_data.get('date_info', '')}
        URL: {raw_event_data.get('url', '')}
        Source: {raw_event_data.get('source', 'web_scraping')}

        Context:
        Target Location: {location}
        Target Month: {month}
        User Interests: {interests}

        Requirements:
        1. Clean and improve the title (max 100 characters, remove HTML, fix formatting)
        2. Create a compelling 2-3 sentence description that highlights what makes this event special
        3. Extract or improve location information to be specific and accurate
        4. Generate relevant tags based on the content and user interests (max 5 tags)
        5. Ensure the URL is valid and properly formatted
        6. Verify the event is actually relevant to the target location and month

        Return ONLY this JSON format (no additional text or explanation):
        {{
          "title": "Clean, engaging event title",
          "location": "Specific location (city, venue if available)",
          "tags": ["tag1", "tag2", "tag3"],
          "url": "valid_url_here",
          "month": "{month}",
          "content": "2-3 compelling sentences about what makes this event special and worth attending",
          "fetched_at": "2025-06-26T00:00:00.000Z"
        }}

        If the event seems irrelevant or low-quality, return: {{"skip": true}}
        """

        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Clean the response to extract JSON
        try:
            # Remove markdown code blocks if present
            cleaned_text = re.sub(r'^```[a-zA-Z]*\n?', '', result_text)
            cleaned_text = re.sub(r'\n?```$', '', cleaned_text)
            
            parsed_result = json.loads(cleaned_text)
            
            # Check if AI suggested skipping this event
            if parsed_result.get('skip'):
                return None
            
            # Validate required fields
            required_fields = ['title', 'location', 'tags', 'url', 'month', 'content']
            if not all(field in parsed_result for field in required_fields):
                print(f"AI response missing required fields: {parsed_result}")
                return None
            
            # Add current timestamp
            parsed_result['fetched_at'] = datetime.utcnow()
            
            return parsed_result
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {e}")
            print(f"Raw response: {result_text}")
            return None
            
    except Exception as e:
        print(f"Error processing with Gemini AI: {e}")
        return None

def batch_process_events_with_ai(events_list, location, month, interests):
    """
    Process multiple events with AI in batches to avoid rate limits
    """
    processed_events = []
    
    for i, event in enumerate(events_list):
        try:
            print(f"Processing event {i+1}/{len(events_list)} with AI: {event.get('title', 'Unknown')[:50]}...")
            
            processed_event = process_with_gemini_ai(event, location, month, interests)
            
            if processed_event:
                processed_events.append(processed_event)
                print(f"✓ AI processed: {processed_event['title'][:50]}...")
            else:
                print(f"✗ AI skipped or failed processing")
            
            # Rate limiting - wait between API calls
            time.sleep(1)
            
        except Exception as e:
            print(f"Error processing event {i+1}: {e}")
            continue
    
    print(f"AI processing complete: {len(processed_events)} events processed from {len(events_list)} raw events")
    return processed_events

def enhance_existing_festival_data(festival_id):
    """
    Enhance an existing festival record with AI-generated improved content
    """
    try:
        festival = festival_collection.find_one({"_id": ObjectId(festival_id)})
        if not festival:
            return {"error": "Festival not found"}
        
        # Check if already enhanced
        if festival.get('ai_enhanced', False):
            return {"message": "Festival already AI-enhanced", "festival": festival}
        
        prompt = f"""
        Enhance this festival/event data to make it more engaging and informative.
        
        Current Data:
        Title: {festival.get('title', '')}
        Location: {festival.get('location', '')}
        Content: {festival.get('content', '')}
        Month: {festival.get('month', '')}
        Tags: {festival.get('tags', [])}
        
        Create an enhanced version with:
        1. A more compelling title (if needed)
        2. Rich, engaging description (3-4 sentences)
        3. Relevant tags that capture the event's essence
        4. Highlight what makes this event unique
        
        Return ONLY this JSON format:
        {{
          "enhanced_title": "Improved title",
          "enhanced_content": "Rich, engaging 3-4 sentence description highlighting what makes this event special",
          "enhanced_tags": ["tag1", "tag2", "tag3", "tag4"],
          "unique_highlights": "What makes this event unique and worth attending"
        }}
        """
        
        response = model.generate_content(prompt)
        result_text = response.text.strip()
        
        # Clean and parse AI response
        cleaned_text = re.sub(r'^```[a-zA-Z]*\n?', '', result_text)
        cleaned_text = re.sub(r'\n?```$', '', cleaned_text)
        
        enhancement_data = json.loads(cleaned_text)
        
        # Update the festival record
        update_data = {
            "title": enhancement_data.get("enhanced_title", festival.get("title")),
            "content": enhancement_data.get("enhanced_content", festival.get("content")),
            "tags": enhancement_data.get("enhanced_tags", festival.get("tags")),
            "unique_highlights": enhancement_data.get("unique_highlights", ""),
            "ai_enhanced": True,
            "enhanced_at": datetime.utcnow()
        }
        
        festival_collection.update_one(
            {"_id": ObjectId(festival_id)},
            {"$set": update_data}
        )
        
        # Return updated festival
        updated_festival = festival_collection.find_one({"_id": ObjectId(festival_id)})
        updated_festival["_id"] = str(updated_festival["_id"])
        
        return {"message": "Festival enhanced successfully", "festival": updated_festival}
        
    except Exception as e:
        return {"error": f"Failed to enhance festival: {str(e)}"}

@csrf_exempt
@api_view(["POST"])
def enhance_festival_ai(request):
    """
    API endpoint to enhance a specific festival with AI
    """
    try:
        data = json.loads(request.body)
        festival_id = data.get("_id")
        
        if not festival_id:
            return JsonResponse({"error": "_id is required"}, status=400)
        
        result = enhance_existing_festival_data(festival_id)
        
        if "error" in result:
            return JsonResponse(result, status=400)
        
        return JsonResponse(result, status=200)
        
    except Exception as e:
        return JsonResponse({"error": f"Server error: {str(e)}"}, status=500)


@csrf_exempt
def generate_heygen_video(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    data = json.loads(request.body.decode("utf-8"))
    doc_id = data.get("_id")
    if not doc_id:
        return JsonResponse({"error": "_id is required"}, status=400)

    doc = festival_collection.find_one({"_id": ObjectId(doc_id)})
    if not doc or "ai_voice_script_en" not in doc:
        return JsonResponse({"error": "Document or ai_voice_script_en not found"}, status=404)

    input_text = doc["ai_voice_script_en"]
    avatar_id = data.get("avatar_id", "Adriana_Business_Front_2_public")
    voice_id = data.get("voice_id", "9ff7fd2dd9114c3bae005e62aa485e52")
    # input_text = data.get("input_text", "Hello, this is a test from Heygen!")

    # Step 1: Generate video
    url = "https://api.heygen.com/v2/video/generate"
    payload = {
        "video_inputs": [
            {
                "avatar_id": avatar_id,
                "voice": {
                    "type": "text",
                    "voice_id": voice_id,
                    "input_text": input_text
                },
                "style": "TalkingHead"
            }
        ],
        "caption": False,
        "dimension": {"width": 1280, "height": 720}
    }
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "x-api-key": HEYGEN_API_KEY
    }
    response = requests.post(url, json=payload, headers=headers)
    result = response.json()
    video_id = result.get("data", {}).get("video_id")
    if not video_id:
        return JsonResponse({"error": "Failed to generate video", "details": result}, status=500)

    # Step 2: Poll for video status
    status_url = "https://api.heygen.com/v1/video_status.get"
    status_headers = {
        "accept": "application/json",
        "x-api-key": HEYGEN_API_KEY
    }
    max_attempts = 20
    for _ in range(max_attempts):
        status_response = requests.get(status_url, headers=status_headers, params={"video_id": video_id})
        status_data = status_response.json()
        video_status = status_data.get("data", {}).get("status")
        if video_status == "completed":
            return JsonResponse(status_data)
        elif video_status == "failed":
            return JsonResponse({"error": "Video generation failed", "details": status_data}, status=500)
        time.sleep(5)  # Wait before polling again

    return JsonResponse({"error": "Video generation timed out", "video_id": video_id}, status=202)