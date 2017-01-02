# Mozilla TechSpeakers support app experiments

Experiments for supporting Mozilla TechSpeakers via various apps, web services etc.

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
