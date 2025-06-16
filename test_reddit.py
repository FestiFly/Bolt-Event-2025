import praw

reddit = praw.Reddit(
    client_id="3VH_mh989qrCYqfsirU959A",
    client_secret="fjqtjosj1j9b5spWZ8YgUQ8N5NNbJw",
    user_agent="Festifly/0.1 by Harlee-28",
    check_for_async=False
)

print("Read-only access:", reddit.read_only)
