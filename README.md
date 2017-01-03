# Mozilla TechSpeakers support app experiments

Experiments for supporting Mozilla TechSpeakers via various apps, web services etc.


## *CFP Calendar Bot* experiment

The bot runs from `index.js`. It scrapes the [Mozilla CFP Calendar](http://bit.ly/mozdevrel-cfps)
and shares reminders of the call for proposal deadlines on various channels.

Currently the bot supports Telegram (The Mozilla TechSpeakers channel) and
Twitter (the [@mozTechCFPs](https://twitter.com/mozTechCFPs) account).

The script runs as a daemon, and at every start of the day (all times are UTC times)
it builds a queue of messages that it will send out at specified times.

For all configuration see `config.json.example` which shows the basic structure
and defaults for the `config.json` file that the daemon uses.

### The CFP Calendar
To aid successful scraping and machine interpretation the CFP Calendar entries
have some rules (as in, conventions):
* Title should be in the format `<event name> (<short date>, <location>)` - this
  makes the event glanceable in the calendar, and the bot will use the info in
  parenthesis when it tweets/messages about events. `<short date>` is the event's
  (not the CFP deadline's!) date, while `<location>` is the succint definition of
  where the event takes place.
* Location field is optional but recommended.
* The calendar events should be marked as full-day events,
  created preferably in UTC/GMT time zone.
* The description can contain anything, but some of the data is parsed and
  rendered by the bot. It might be useful to add a one-line summary to
  describe the event, but this is not currently used.
* If the event has a webpage, or even better,
  a dedicated cfp/call for (submissions/proposals) page, put a link into the
  description field to have it show up on bot tweets/messages.
* Same goes for a Twitter-handle: put `@<event-twitter-handle>` into anywhere
  in the event description and it will show up on various communications.  

### Feed
When the app scrapes the calendar data, it converts it into a JSON that it stores
under `data/cfp.json`. The app then generates a daily *feed* from this - a list of
conference proposals that are appropriate based on the current date, it also
does some ranking.

These methods are mostly implemented in `lib/calendar.js`.  
`lib/dates.js` has some additional support functions for all-across date handling.

### Twitter
Twitter support uses a custom twitter app (`API_KEY` & `API_SECRET`), as well as a
user-authentication (for `@mozTechCFPs`, see `ACCESS_TOKEN` & `ACCESS_TOKEN_SECRET`)
to tweet two different kinds of daily messages:

* **Weekly highlights** are tweeted on every Monday, and list the upcoming CFP
  deadlines that week, but mostly only include the name of the conference.
* **Daily reminders** are tweeted on the day a conference proposal is due,
  and include all relevant information that can be scraped from the calendar
  entry.

Most of this functionality is implemented in `lib/cfp-twitter.js`.

### Telegram
Telegram support uses the bot integration via the Telegram Bot API. To learn
more about the Telegram Bot integration, read the TinSpeaker experiment below.

The Telegram-integration is different from the Twitter one in that it only posts
a single message every day to the Mozilla TechSpeakers Telegram-group. This one
message can contain reminders for several events.

At the start of each week the bot will tweet about all upcoming deadlines for
that week, while daily tweets include reminders for deadlines that day ("today")
and the next day ("tomorrow").

Most of this functionality comes from `lib/cfp-telegram.js`.


## _TinSpeaker_ experiment

TinSpeaker is an experiment researching the features of the [Telegram API].

With TinSpeaker one can create a new Bot, add it to a channel and post simple,
formatted messages, links etc. to that channel via the Bot using a simple html
web form.

Sources are located in the `/tinspeaker` directory. The code lets you send
messages to the Telegram API, by creating a [Telegram bot] (we are using the
[mozTechSpeakersBot]).

You need to provide `config.json` in the root with your credentials:

```
{
  "TELEGRAM": {
    "BOT_ID": "bot0000000",
    "ACCESS_TOKEN": "...",
    "CHAT_ID": "000",
    "CHAT_ID_DEBUG": "000"
  }
}
```

`BOT_ID` is the ID of the created bot, `ACCESS_TOKEN` is the Telegram-provided
access token, `CHAT_ID` & `CHAT_ID_DEBUG` are the id-s for the chatrooms you
want your bot to interact with.

Launch the app locally via node.js by running:

```
$ node tinspeaker/server.js
Tinspeaker server started on http://localhost:8000/

```
After the server is started and open `http://localhost:8000`. You can use the
debug Chat ID by providing `#DEBUG` in the url. You should provide your own
chat ID with the bot in the `CHAT_ID_DEBUG` variable for testing.

You can now use the textbox to send messages (also, you can use
[simplified markdown] formatting in your messages).

### Note

You should be aware, this experiment uses [crossorigin.me] for API requests (as the bot API lacks any [CORS] headers). You should only use this for learning and experimenting, do not supply any sensitive data here.  
(*TODO: use a local node proxy*)

[Telegram API]: https://core.telegram.org/api
[Telegram bot]: https://core.telegram.org/bots/api
[mozTechSpeakersBot]: http://telegram.me/mozTechSpeakersBot
[simplified markdown]: https://core.telegram.org/bots/api#formatting-options
[crossorigin.me]: https://crossorigin.me/
[CORS]: http://enable-cors.org/

### FAQ
* **How can a create my bot?**  
  [Botfather] to the rescue!  
  Use the `/start` command to get info on the commands, use `/newbot` to create a bot.
* **What is my bot's id?**  
  Once you named your bot, the botfather will tell you its id and your HTTP API access token:
  ```
  Done! Congratulations on your new bot...

  [...]

  Use this token to access the HTTP API:
  <bot's numeric id>:<access token>
  ```
  You sould prefix your bot's numeric ID with `bot` in the `config.json`.
* **How to get an access token?**  
  See above, the access token is the second part of the value given by the botfather, after the colon.
* **Where can I find the chat id?**  
  Chat id uniquely identifies a conversation your bot is involved in. Use the `/getUpdates` API call drop your bot a message on Telegram and click the *Get bot updates!* button in TinSpeaker.

[Botfather]: http://telegram.me/BotFather
