# Feedback

Web application to help knowledge discovery from tagged and georeferenced messages

![Screenshot](http://users.dcc.uchile.cl/~spenafie/misc/feedback_sc1.png)

### Visualization Modes

The application offers 3 ways to display data:

- Timeline: Ordered by the publishing time of the feed.
- Geographical: Located as markers in a map according the georeference of the feed.
- Concept network: Linking feeds with others by its common tags.

### Advanced Search

Feedback offers an advanced way to navigate the information when data is big.

![Screenshot](http://users.dcc.uchile.cl/~spenafie/misc/feedback_sc2.png)

There are options to search specific feeds. The user can perform search by content, time, geographic location and tags.

There are 2 options as the result of a search:

  - Filter: Takes the current visible feeds and perform the search, only feeds which satisfy the conditions are left, all the rest is filtered.
  - Append: Takes the total available feeds in the session and perform the search, all visible feed are left and other feeds that satisfy the conditions are now visible.
  
### Twitter Integration

Feedback can import data from Twitter sources.

![Screenshot](http://users.dcc.uchile.cl/~spenafie/misc/feedback_sc3.png)

Tweets are search by its content and location, they are processed and then treated like feeds, inheriting all functionalities of feeds like timeline position, appearing in concept network, markers (if available) and searching.

:information_source: Secret key is required in order to import Twitter data