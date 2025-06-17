import praw

reddit = praw.Reddit(
    client_id="3VH_mh989qrCYqfsirU959A",
    client_secret="fjqtjosj1j9b5spWZ8YgUQ8N5NNbJw",
    user_agent="Festifly/0.1 by Harlee-28",
    check_for_async=False  # <-- This is critical in Python 3.12+
)

submission = reddit.submission(url="https://www.reddit.com/r/Python/comments/1lccbj2/the_gil_is_actually_going_away_have_you_tried_a/")
submission.comments.replace_more(limit=0)

for comment in submission.comments:
    print(comment.body)