var serverStartTime = new Date().getTime();

var tmi = require("tmi.js");
var fs = require("fs");
var cmd = require("node-cmd");
var os = require("os");
var http = require("http");
var https = require("https")
var url = require("url");
var path = require("path");
var mongoClient = require("mongodb").MongoClient;
var mongoUrl = "mongodb://127.0.0.1/";

var globalConfig = JSON.parse(fs.readFileSync("global.json", "utf8")); // Contains Web server settings, which controller to use, which chat settings to use
var chatConfig = JSON.parse(fs.readFileSync(globalConfig.chat_config, "utf8")); // Contains chat settings, what account to use, what oauth, what channels to join
var loadingStringsConfig = JSON.parse(fs.readFileSync(globalConfig.loading_strings_config, "utf8")); // Contains loading strings that are displayed when overlay is set to display loading strings (query name is display_loading_strings=1)
var twitchCredentials = JSON.parse(fs.readFileSync("twitch_credentials.json", "utf8")); // Contains Twitch Credentials used to generate OAuth 2.0 Tokens as well as the Channel ID, which is used to update channel information such as stream title
var twitchJsonEncodedAppAccessToken = {}; // Object returned from the Twitch API which contains the OAuth 2.0 Token that was generated using the Twitch Credentials, as mentioned above, this OAuth 2.0 token is used to make API calls to twitch. This Object isn't changes every time the server starts.
var twitchJsonEncodedBotAppAccessToken = {}; // Object returned from the Twitch API which contains the OAuth 2.0 Token that was generated using the Twitch Credentials, as mentioned above, this OAuth 2.0 token is used to make API calls to twitch. This Object isn't changes every time the server starts.
var channelToSendMessageTo = chatConfig.main_channel;
var chatLoggerReconnectAttempts = 0;
var clientReconnectAttempts = 0;
var checkChatConnectionPeriodically = chatConfig.check_chat_connection_periodically;
var checkChatConnectionPeriodMillis = chatConfig.check_chat_connection_period_millis;
var sendPingPeriodically = chatConfig.send_ping_periodically;
var sendPingPeriodMillis = chatConfig.send_ping_period_millis;
var sendPingIndependentlyFromCheckChatConnection = chatConfig.send_ping_independently_from_check_chat_connection;

var queryFound = false;
var queryToUse = {};

var dataToDisplay = [
  {
    query_value: 0, // done
    default_value: 0,
    query_name: "channel_id",
    data_type: "int",
    is_valid: false
  },
  // Viewer Count (All implemented in overlay except for font)
  {
    query_value: false, // done
    default_value: false,
    query_name: "display_viewer_count",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 1915, // done
    default_value: 1915,
    query_name: "viewer_count_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 1024, // done
    default_value: 1024,
    query_name: "viewer_count_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf", // Leave it for later
    default_value: "VCREAS_3.0.ttf",
    query_name: "viewer_count_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3, // done
    default_value: 3,
    query_name: "viewer_count_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true, // done
    default_value: true,
    query_name: "viewer_count_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2, // done
    default_value: 2,
    query_name: "viewer_count_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true, // done
    default_value: true,
    query_name: "viewer_count_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19, // done
    default_value: 19,
    query_name: "viewer_count_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true, // done
    default_value: true,
    query_name: "viewer_count_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "viewer_count_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "viewer_count_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "viewer_count_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Stream Uptime
  {
    query_value: false, // done
    default_value: false,
    query_name: "display_twitch_stream_uptime",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 5, // done
    default_value: 5,
    query_name: "twitch_stream_uptime_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 973, // done
    default_value: 973,
    query_name: "twitch_stream_uptime_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf", // Leave it for later
    default_value: "VCREAS_3.0.ttf",
    query_name: "twitch_stream_uptime_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3, // done
    default_value: 3,
    query_name: "twitch_stream_uptime_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true, // done
    default_value: true,
    query_name: "twitch_stream_uptime_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2, // done
    default_value: 2,
    query_name: "twitch_stream_uptime_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true, // done
    default_value: true,
    query_name: "twitch_stream_uptime_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19, // done
    default_value: 19,
    query_name: "twitch_stream_uptime_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true, // done
    default_value: true,
    query_name: "twitch_stream_uptime_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "twitch_stream_uptime_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "twitch_stream_uptime_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "twitch_stream_uptime_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Current Time
  {
    query_value: true, // done
    default_value: true,
    query_name: "display_current_time",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 5, // done
    default_value: 5,
    query_name: "current_time_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 1024, // done
    default_value: 1024,
    query_name: "current_time_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf", // Leave it for later
    default_value: "VCREAS_3.0.ttf",
    query_name: "current_time_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3, // done
    default_value: 3,
    query_name: "current_time_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true, // done
    default_value: true,
    query_name: "current_time_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2, // done
    default_value: 2,
    query_name: "current_time_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true, // done
    default_value: true,
    query_name: "current_time_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19, // done
    default_value: 19,
    query_name: "current_time_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true, // done
    default_value: true,
    query_name: "current_time_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "current_time_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "current_time_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "current_time_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Loading Strings
  {
    query_value: false, // done
    default_value: false,
    query_name: "display_loading_strings",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 960, // done
    default_value: 960,
    query_name: "loading_strings_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 540, // done
    default_value: 540,
    query_name: "loading_strings_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf", // leave it for later
    default_value: "VCREAS_3.0.ttf",
    query_name: "loading_strings_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3, // done
    default_value: 3,
    query_name: "loading_strings_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true, // done
    default_value: true,
    query_name: "loading_strings_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2, // done
    default_value: 2,
    query_name: "loading_strings_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true, // done
    default_value: true,
    query_name: "loading_strings_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19, // done
    default_value: 19,
    query_name: "loading_strings_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true, // done
    default_value: true,
    query_name: "loading_strings_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "loading_strings_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "loading_strings_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "loading_strings_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Audio Related Stuff
  {
    query_value: "", // done
    default_value: "",
    query_name: "audio_name",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 0, // unused
    default_value: 0,
    query_name: "audio_volume",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "audio_loop",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "audio_play",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "audio_pause",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false, // done
    default_value: false,
    query_name: "audio_stop",
    data_type: "boolean",
    is_valid: false
  }
];

var validQueryDataFound = false;

var defaultColors = ["#0000FF", "#8A2BE2", "#5F9EA0", "#D2691E", "#FF7F50", "#1E90FF", "#B22222", "#DAA520", "#008000", "#FF69B4", "#FF4500", "#FF0000", "#2E8B57", "#00FF7F", "#9ACD32"];
var defaultColorNames = ["blue", "blue_violet", "cadet_blue", "chocolate", "coral", "dodger_blue", "firebrick", "golden_rod", "green", "hot_pink", "orange_red", "red", "sea_green", "spring_green", "yellow_green"];
var followAgeResponses = ["You have been following for like uhhh a very long time?", "You're not following at all wtf", "You have just started following I think idk"];

var server = http.createServer(handleRequest);
server.listen(globalConfig.webserver_port);

console.log("Server started on port " + globalConfig.webserver_port);

function handleRequest(req, res) {
  // What did we request?
  let pathname = req.url;
  let pathname2 = pathname;
  let urlData = url.parse(req.url, true);
  let queryData = urlData.query;
  let channelIdToGetData = "";

  pathname = pathname.replace(/\?+[\w\:\/\d\.\\\-\_\=\&\%\$]*/ig, "");
  if (pathname.toLowerCase() !== pathname2.toLowerCase()) {
    if (queryFound == false) {
      queryFound = true;
      pathname = pathname.replace(/\?+[\w\:\/\d\.\\\-\_\=\&\%\$]*/ig, "");
      queryToUse = queryData;

      //console.log(Object.keys(queryToUse));
      //console.log(queryToUse);
      let queryKeys = Object.keys(queryToUse);
      let lowerCaseQueryKeys = [];
      let queryKeysSize = queryKeys.length;

      for (let queryKeysIndex = 0; queryKeysIndex < queryKeysSize; queryKeysIndex++) {
        lowerCaseQueryKeys[queryKeysIndex] = queryKeys[queryKeysIndex].toLowerCase();
      }

      //console.log("lowerCaseQueryKeys");
      //console.log(lowerCaseQueryKeys);

      for (let dataToDisplayIndex = 0; dataToDisplayIndex < dataToDisplay.length; dataToDisplayIndex++) {
        let queryNameIndex = lowerCaseQueryKeys.findIndex(element => element == dataToDisplay[dataToDisplayIndex].query_name.toLowerCase());
        if (queryNameIndex >= 0) {
          //console.log("queryNameIndex");
          //console.log(queryNameIndex);
          //console.log(dataToDisplay[dataToDisplayIndex]);
          //console.log(dataToDisplayIndex);
          if (dataToDisplay[dataToDisplayIndex].data_type.toLowerCase() == "string") {
            //console.log("Parse String Here");
            if (queryToUse[lowerCaseQueryKeys[queryNameIndex]] === "" || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === undefined || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === null || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === [] || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === "[]" || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === {} || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === "{}" || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === "null" || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === "undefined") {
              // Invalid
              //console.log("INVALID STRING?????????????????????????????????????????");
              dataToDisplay[dataToDisplayIndex].query_value = "";
              dataToDisplay[dataToDisplayIndex].is_valid = false;
            }
            if (queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== "" && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== undefined && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== null && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== [] && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== "[]" && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== {} && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== "{}" && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== "null" && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== "undefined") {
              // Valid
              //console.log("VALID STRING!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
              dataToDisplay[dataToDisplayIndex].query_value = queryToUse[lowerCaseQueryKeys[queryNameIndex]];
              dataToDisplay[dataToDisplayIndex].is_valid = true;
            }
          }
          if (dataToDisplay[dataToDisplayIndex].data_type.toLowerCase() == "boolean") {
            //console.log("Parse Boolean Here");
            if (queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== "" && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== undefined && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== null && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== [] && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== "[]" && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== {} && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== "{}" && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== "null" && queryToUse[lowerCaseQueryKeys[queryNameIndex]] !== "undefined") {
              //console.log("CASE A");
              if (isNaN(parseInt(queryToUse[lowerCaseQueryKeys[queryNameIndex]], 10)) == false) {
                dataToDisplay[dataToDisplayIndex].query_value = !! + queryToUse[lowerCaseQueryKeys[queryNameIndex]];
                dataToDisplay[dataToDisplayIndex].is_valid = true;
                if (parseInt(queryToUse[lowerCaseQueryKeys[queryNameIndex]], 10) < 0) {
                  dataToDisplay[dataToDisplayIndex].query_value = false;
                  dataToDisplay[dataToDisplayIndex].is_valid = false;
                }
              }
              if (isNaN(parseInt(queryToUse[lowerCaseQueryKeys[queryNameIndex]], 10)) == true) {
                dataToDisplay[dataToDisplayIndex].query_value = false;
                dataToDisplay[dataToDisplayIndex].is_valid = false;
              }
            }
            if (queryToUse[lowerCaseQueryKeys[queryNameIndex]] === "" || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === undefined || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === null || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === [] || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === "[]" || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === {} || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === "{}" || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === "null" || queryToUse[lowerCaseQueryKeys[queryNameIndex]] === "undefined") {
              //console.log("CASE B");
              dataToDisplay[dataToDisplayIndex].query_value = false;
              dataToDisplay[dataToDisplayIndex].is_valid = false;
            }
          }
          if (dataToDisplay[dataToDisplayIndex].data_type.toLowerCase() == "int") {
            //console.log("Parse Int Here");
            //console.log("queryToUse[lowerCaseQueryKeys[queryNameIndex]]");
            //console.log(queryToUse[lowerCaseQueryKeys[queryNameIndex]]); // This works
            if (isNaN(parseInt(queryToUse[lowerCaseQueryKeys[queryNameIndex]], 10)) == false) {
              dataToDisplay[dataToDisplayIndex].query_value = parseInt(queryToUse[lowerCaseQueryKeys[queryNameIndex]], 10);
              dataToDisplay[dataToDisplayIndex].is_valid = true;
              if (dataToDisplay[dataToDisplayIndex].query_value < 0) {
                dataToDisplay[dataToDisplayIndex].query_value = 0;
                dataToDisplay[dataToDisplayIndex].is_valid = false;
              }
            }
            if (isNaN(parseInt(queryToUse[lowerCaseQueryKeys[queryNameIndex]], 10)) == true) {
              dataToDisplay[dataToDisplayIndex].query_value = 0;
              dataToDisplay[dataToDisplayIndex].is_valid = false;
            }
          }
          //console.log(dataToDisplay[dataToDisplayIndex]);
          //console.log(dataToDisplayIndex);
          if (dataToDisplay[dataToDisplayIndex].is_valid == true) {
            //console.log("A dataToDisplayIndex");
            //console.log(dataToDisplayIndex);
            //console.log("A dataToDisplay[dataToDisplayIndex].is_valid");
            //console.log(dataToDisplay[dataToDisplayIndex].is_valid);
            //console.log("A dataToDisplay[dataToDisplayIndex]");
            //console.log(dataToDisplay[dataToDisplayIndex]);
            validQueryDataFound = true;
            //console.log("B dataToDisplayIndex");
            //console.log(dataToDisplayIndex);
            //console.log("B dataToDisplay[dataToDisplayIndex].is_valid");
            //console.log(dataToDisplay[dataToDisplayIndex].is_valid);
            //console.log("B dataToDisplay[dataToDisplayIndex]");
            //console.log(dataToDisplay[dataToDisplayIndex]);
          }
        }
      }
    }
  }
  // If blank let's ask for index.html
  if (pathname == "/") {
    pathname = "/index.html";
  }

  // Ok what's our file extension
  var ext = path.extname(pathname);

  // Map extension to file type
  var typeExt = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".ttf": "font/ttf",
    ".ico": "image/vnd.microsoft.icon",
    ".mp3": "audio/mpeg",
    ".png": "image/png",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".gif": "image/gif"
  };

  // What is it?  Default to plain text
  var contentType = typeExt[ext] || "text/plain";

  // User file system module
  fs.readFile(__dirname + pathname,
    // Callback function for reading
    function(err, data) {
      // if there is an error
      if (err) {
        queryFound = false;
        queryToUse = {};
        dataToDisplay = [
  {
    query_value: 0,
    default_value: 0,
    query_name: "channel_id",
    data_type: "int",
    is_valid: false
  },
  // Viewer Count
  {
    query_value: false,
    default_value: false,
    query_name: "display_viewer_count",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 1915, // done
    default_value: 1915,
    query_name: "viewer_count_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 1024,
    default_value: 1024,
    query_name: "viewer_count_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf",
    default_value: "VCREAS_3.0.ttf",
    query_name: "viewer_count_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3,
    default_value: 3,
    query_name: "viewer_count_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "viewer_count_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2,
    default_value: 2,
    query_name: "viewer_count_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "viewer_count_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19,
    default_value: 19,
    query_name: "viewer_count_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "viewer_count_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "viewer_count_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "viewer_count_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "viewer_count_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Stream Uptime
  {
    query_value: false,
    default_value: false,
    query_name: "display_twitch_stream_uptime",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 5,
    default_value: 5,
    query_name: "twitch_stream_uptime_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 973,
    default_value: 973,
    query_name: "twitch_stream_uptime_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf",
    default_value: "VCREAS_3.0.ttf",
    query_name: "twitch_stream_uptime_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3,
    default_value: 3,
    query_name: "twitch_stream_uptime_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "twitch_stream_uptime_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2,
    default_value: 2,
    query_name: "twitch_stream_uptime_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "twitch_stream_uptime_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19,
    default_value: 19,
    query_name: "twitch_stream_uptime_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "twitch_stream_uptime_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "twitch_stream_uptime_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "twitch_stream_uptime_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "twitch_stream_uptime_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Current Time
  {
    query_value: true,
    default_value: true,
    query_name: "display_current_time",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 5,
    default_value: 5,
    query_name: "current_time_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 1024,
    default_value: 1024,
    query_name: "current_time_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf",
    default_value: "VCREAS_3.0.ttf",
    query_name: "current_time_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3,
    default_value: 3,
    query_name: "current_time_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "current_time_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2,
    default_value: 2,
    query_name: "current_time_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "current_time_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19,
    default_value: 19,
    query_name: "current_time_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "current_time_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "current_time_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "current_time_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "current_time_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Loading Strings
  {
    query_value: false,
    default_value: false,
    query_name: "display_loading_strings",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 960,
    default_value: 960,
    query_name: "loading_strings_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 540,
    default_value: 540,
    query_name: "loading_strings_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf",
    default_value: "VCREAS_3.0.ttf",
    query_name: "loading_strings_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3,
    default_value: 3,
    query_name: "loading_strings_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "loading_strings_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2,
    default_value: 2,
    query_name: "loading_strings_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "loading_strings_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19,
    default_value: 19,
    query_name: "loading_strings_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "loading_strings_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "loading_strings_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "loading_strings_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "loading_strings_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Audio Related Stuff
  {
    query_value: "",
    default_value: "",
    query_name: "audio_name",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 0,
    default_value: 0,
    query_name: "audio_volume",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "audio_loop",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "audio_play",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "audio_pause",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "audio_stop",
    data_type: "boolean",
    is_valid: false
  }
        ];
        validQueryDataFound = false;
        res.writeHead(500);
        return res.end("Error loading " + pathname);
      }
      // Otherwise, send the data, the contents of the file
      res.writeHead(200, {
        "Content-Type": contentType
      });
      res.end(data);
    }
  );
}

// WebSocket Portion
// WebSockets work with the HTTP server
var io = require("socket.io").listen(server);

// Register a callback function to run when we have an individual connection
// This is run for each individual user that connects
io.sockets.on("connection",
  // We are given a websocket object in our function
  function(socket) {
    console.log(new Date().toISOString() + " We have a new client: " + socket.id);
    chatConnectionStatus = {
      chat_logger_ready_state: chatLogger.readyState(),
      client_ready_state: client.readyState(),
      client_reconnect_attempts: clientReconnectAttempts,
      chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
      server_start_time: serverStartTime,
      server_current_time: new Date().getTime()
    };
    io.sockets.emit("chat_connection_status", chatConnectionStatus);
    //console.log("queryFound");
    //console.log(queryFound);
    //console.log("validQueryDataFound");
    //console.log(validQueryDataFound);
    io.to(socket.id).emit("query_found", queryFound);
    io.to(socket.id).emit("valid_query_data_found", validQueryDataFound);
    if (validQueryDataFound == true) {
      // todo: make it so overlay can reload (or load new files) audio files without having to reload the entire overlay (DONE)
      io.to(socket.id).emit("query_to_use", queryToUse);
      io.to(socket.id).emit("data_to_display", dataToDisplay);
      let audioNameIndex = dataToDisplay.findIndex(element => element.query_name == "audio_name".toLowerCase());
      //console.log(dataToDisplay[audioNameIndex]);
      if (audioNameIndex >= 0) {
        if (dataToDisplay[audioNameIndex].is_valid == false) {
          // Use default_value here
          //
        }
        if (dataToDisplay[audioNameIndex].is_valid == true) {
          // Use query_value here
          io.sockets.emit("audio_name", dataToDisplay[audioNameIndex].query_value);
        }
      }
      let audioLoopIndex = dataToDisplay.findIndex(element => element.query_name == "audio_loop".toLowerCase());
      //console.log(dataToDisplay[audioLoopIndex]);
      if (audioLoopIndex >= 0) {
        if (dataToDisplay[audioLoopIndex].is_valid == false) {
          // Use default_value here
          //
        }
        if (dataToDisplay[audioLoopIndex].is_valid == true) {
          // Use query_value here
          io.sockets.emit("loop_audio", dataToDisplay[audioLoopIndex].query_value);
        }
      }
      let audioPlayIndex = dataToDisplay.findIndex(element => element.query_name == "audio_play".toLowerCase());
      //console.log(dataToDisplay[audioPlayIndex]);
      if (audioPlayIndex >= 0) {
        if (dataToDisplay[audioPlayIndex].is_valid == false) {
          // Use default_value here
          //
        }
        if (dataToDisplay[audioPlayIndex].is_valid == true) {
          // Use query_value here
          if (dataToDisplay[audioPlayIndex].query_value == false) {
            //
          }
          if (dataToDisplay[audioPlayIndex].query_value == true) {
            //
            io.sockets.emit("play_audio", true);
          }
        }
      }
      let audioPauseIndex = dataToDisplay.findIndex(element => element.query_name == "audio_pause".toLowerCase());
      //console.log(dataToDisplay[audioPauseIndex]);
      if (audioPauseIndex >= 0) {
        if (dataToDisplay[audioPauseIndex].is_valid == false) {
          // Use default_value here
          //
        }
        if (dataToDisplay[audioPauseIndex].is_valid == true) {
          // Use query_value here
          if (dataToDisplay[audioPauseIndex].query_value == false) {
            //
          }
          if (dataToDisplay[audioPauseIndex].query_value == true) {
            //
            io.sockets.emit("pause_audio", true);
          }
        }
      }
      let audioStopIndex = dataToDisplay.findIndex(element => element.query_name == "audio_stop".toLowerCase());
      //console.log(dataToDisplay[audioStopIndex]);
      if (audioStopIndex >= 0) {
        if (dataToDisplay[audioStopIndex].is_valid == false) {
          // Use default_value here
          //
        }
        if (dataToDisplay[audioStopIndex].is_valid == true) {
          // Use query_value here
          if (dataToDisplay[audioStopIndex].query_value == false) {
            //
          }
          if (dataToDisplay[audioStopIndex].query_value == true) {
            //
            io.sockets.emit("stop_audio", true);
          }
        }
      }
    }
    queryFound = false;
    queryToUse = {};
    dataToDisplay = [
  {
    query_value: 0,
    default_value: 0,
    query_name: "channel_id",
    data_type: "int",
    is_valid: false
  },
  // Viewer Count
  {
    query_value: false,
    default_value: false,
    query_name: "display_viewer_count",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 1915, // done
    default_value: 1915,
    query_name: "viewer_count_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 1024,
    default_value: 1024,
    query_name: "viewer_count_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf",
    default_value: "VCREAS_3.0.ttf",
    query_name: "viewer_count_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3,
    default_value: 3,
    query_name: "viewer_count_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "viewer_count_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2,
    default_value: 2,
    query_name: "viewer_count_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "viewer_count_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19,
    default_value: 19,
    query_name: "viewer_count_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "viewer_count_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "viewer_count_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "viewer_count_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "viewer_count_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Stream Uptime
  {
    query_value: false,
    default_value: false,
    query_name: "display_twitch_stream_uptime",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 5,
    default_value: 5,
    query_name: "twitch_stream_uptime_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 973,
    default_value: 973,
    query_name: "twitch_stream_uptime_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf",
    default_value: "VCREAS_3.0.ttf",
    query_name: "twitch_stream_uptime_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3,
    default_value: 3,
    query_name: "twitch_stream_uptime_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "twitch_stream_uptime_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2,
    default_value: 2,
    query_name: "twitch_stream_uptime_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "twitch_stream_uptime_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19,
    default_value: 19,
    query_name: "twitch_stream_uptime_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "twitch_stream_uptime_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "twitch_stream_uptime_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "twitch_stream_uptime_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "twitch_stream_uptime_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Current Time
  {
    query_value: true,
    default_value: true,
    query_name: "display_current_time",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 5,
    default_value: 5,
    query_name: "current_time_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 1024,
    default_value: 1024,
    query_name: "current_time_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf",
    default_value: "VCREAS_3.0.ttf",
    query_name: "current_time_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3,
    default_value: 3,
    query_name: "current_time_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "current_time_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2,
    default_value: 2,
    query_name: "current_time_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "current_time_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19,
    default_value: 19,
    query_name: "current_time_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "current_time_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "current_time_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "current_time_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "current_time_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Loading Strings
  {
    query_value: false,
    default_value: false,
    query_name: "display_loading_strings",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 960,
    default_value: 960,
    query_name: "loading_strings_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 540,
    default_value: 540,
    query_name: "loading_strings_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf",
    default_value: "VCREAS_3.0.ttf",
    query_name: "loading_strings_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3,
    default_value: 3,
    query_name: "loading_strings_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "loading_strings_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2,
    default_value: 2,
    query_name: "loading_strings_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "loading_strings_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19,
    default_value: 19,
    query_name: "loading_strings_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "loading_strings_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "loading_strings_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "loading_strings_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "loading_strings_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Audio Related Stuff
  {
    query_value: "",
    default_value: "",
    query_name: "audio_name",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 0,
    default_value: 0,
    query_name: "audio_volume",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "audio_loop",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "audio_play",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "audio_pause",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "audio_stop",
    data_type: "boolean",
    is_valid: false
  }
    ];
    validQueryDataFound = false;
    socket.on("request_twitch_stream_status", function(data) {
      let timeOverlayRequestedTwitchStreamStatus = {
        time_server_received_twitch_stream_status_request: new Date().getTime(),
        time_overlay_requested_twitch_stream_status: data.time_overlay_requested_twitch_stream_status
      };
      timeOverlayRequestedTwitchStreamStatus.overlay_to_server_time_drift_millis = timeOverlayRequestedTwitchStreamStatus.time_server_received_twitch_stream_status_request - timeOverlayRequestedTwitchStreamStatus.time_overlay_requested_twitch_stream_status;
      //console.log("timeOverlayRequestedTwitchStreamStatus = ");
      //console.log(timeOverlayRequestedTwitchStreamStatus);
      //console.log(new Date().toISOString() + " request_twitch_stream_status = ");
      //console.log(data);
      //console.log(new Date().toISOString() + " socket.id = " + socket.id);
      getTwitchStreamStatus(data.channel_id, "", "", "", "", twitchCredentials, twitchJsonEncodedBotAppAccessToken, true, socket.id, timeOverlayRequestedTwitchStreamStatus);
    });
    socket.on("restart_command", function(data) {
      console.log(new Date().toISOString() + " We received the restart_command " + data + ", which means someone pressed Q on the keyboard (or pressed the RESTART MODBOT button) to restart the modbot, or pressed P on the keyboard (or pressed the RESTART MACHINE button) to restart the machine, or pressed R on the keyboard (or pressed the RESTART CONNECTION button) to restart the chat connection, on the status_page!");
      if (data == "restart_modbot") {
        console.log(new Date().toISOString() + " Someone pressed Q on the keyboard (or pressed the RESTART MODBOT button) on the status_page to restart the modbot, Restarting modbot!");
        quitApp();
      }
      if (data == "restart_machine") {
        console.log(new Date().toISOString() + " Someone pressed P on the keyboard (or pressed the RESTART MACHINE button) on the status_page to restart the machine, Restarting machine!");
        restartMachine();
      }
      if (data == "restart_connection") {
        restartChatConnection();
      }
    });
    globalConfig = JSON.parse(fs.readFileSync("global.json", "utf8")); // Contains Web server settings, which controller to use, which chat settings to use
    chatConfig = JSON.parse(fs.readFileSync(globalConfig.chat_config, "utf8")); // Contains chat settings, what account to use, what oauth, what channels to join
    loadingStringsConfig = JSON.parse(fs.readFileSync(globalConfig.loading_strings_config, "utf8")); // Contains loading strings that are displayed when overlay is set to display loading strings (query name is display_loading_strings=1)
    twitchCredentials = JSON.parse(fs.readFileSync("twitch_credentials.json", "utf8")); // Contains Twitch Credentials used to generate OAuth 2.0 Tokens as well as the Channel ID, which is used to update channel information such as stream title
    io.sockets.emit("loading_strings", loadingStringsConfig);
    io.sockets.emit("global_config", globalConfig);
    socket.on("disconnect", function() {
      queryFound = false;
      queryToUse = {};
      dataToDisplay = [
  {
    query_value: 0,
    default_value: 0,
    query_name: "channel_id",
    data_type: "int",
    is_valid: false
  },
  // Viewer Count
  {
    query_value: false,
    default_value: false,
    query_name: "display_viewer_count",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 1915, // done
    default_value: 1915,
    query_name: "viewer_count_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 1024,
    default_value: 1024,
    query_name: "viewer_count_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf",
    default_value: "VCREAS_3.0.ttf",
    query_name: "viewer_count_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3,
    default_value: 3,
    query_name: "viewer_count_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "viewer_count_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2,
    default_value: 2,
    query_name: "viewer_count_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "viewer_count_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19,
    default_value: 19,
    query_name: "viewer_count_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "viewer_count_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "viewer_count_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "viewer_count_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "viewer_count_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Stream Uptime
  {
    query_value: false,
    default_value: false,
    query_name: "display_twitch_stream_uptime",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 5,
    default_value: 5,
    query_name: "twitch_stream_uptime_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 973,
    default_value: 973,
    query_name: "twitch_stream_uptime_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf",
    default_value: "VCREAS_3.0.ttf",
    query_name: "twitch_stream_uptime_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3,
    default_value: 3,
    query_name: "twitch_stream_uptime_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "twitch_stream_uptime_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2,
    default_value: 2,
    query_name: "twitch_stream_uptime_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "twitch_stream_uptime_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19,
    default_value: 19,
    query_name: "twitch_stream_uptime_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "twitch_stream_uptime_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "twitch_stream_uptime_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "twitch_stream_uptime_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "twitch_stream_uptime_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Current Time
  {
    query_value: true,
    default_value: true,
    query_name: "display_current_time",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 5,
    default_value: 5,
    query_name: "current_time_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 1024,
    default_value: 1024,
    query_name: "current_time_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf",
    default_value: "VCREAS_3.0.ttf",
    query_name: "current_time_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3,
    default_value: 3,
    query_name: "current_time_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "current_time_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2,
    default_value: 2,
    query_name: "current_time_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "current_time_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19,
    default_value: 19,
    query_name: "current_time_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "current_time_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "current_time_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "current_time_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "current_time_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Loading Strings
  {
    query_value: false,
    default_value: false,
    query_name: "display_loading_strings",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 960,
    default_value: 960,
    query_name: "loading_strings_xpos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: 540,
    default_value: 540,
    query_name: "loading_strings_ypos",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: "VCREAS_3.0.ttf",
    default_value: "VCREAS_3.0.ttf",
    query_name: "loading_strings_font",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 3,
    default_value: 3,
    query_name: "loading_strings_font_size",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "loading_strings_font_size_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 2,
    default_value: 2,
    query_name: "loading_strings_font_stroke_weight",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "loading_strings_font_stroke_weight_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: 19,
    default_value: 19,
    query_name: "loading_strings_font_leading",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: true,
    default_value: true,
    query_name: "loading_strings_font_leading_use_multiplier",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "loading_strings_font_align_right",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "loading_strings_font_align_center",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "loading_strings_font_align_bottom",
    data_type: "boolean",
    is_valid: false
  },
  // Audio Related Stuff
  {
    query_value: "",
    default_value: "",
    query_name: "audio_name",
    data_type: "string",
    is_valid: false
  },
  {
    query_value: 0,
    default_value: 0,
    query_name: "audio_volume",
    data_type: "int",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "audio_loop",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "audio_play",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "audio_pause",
    data_type: "boolean",
    is_valid: false
  },
  {
    query_value: false,
    default_value: false,
    query_name: "audio_stop",
    data_type: "boolean",
    is_valid: false
  }
      ];
      validQueryDataFound = false;
      console.log(new Date().toISOString() + " Client has disconnected: " + socket.id);
    });
  }
);

var shiftCharCode = Δ => c => String.fromCharCode(c.charCodeAt(0) + Δ);
var cyrillicsReplacementTable = [{
  symbolOriginalString: /А/g,
  symbolReplacementString: "A"
}, {
  symbolOriginalString: /В/g,
  symbolReplacementString: "B"
}, {
  symbolOriginalString: /Е/g,
  symbolReplacementString: "E"
}, {
  symbolOriginalString: /З/g,
  symbolReplacementString: "3"
}, {
  symbolOriginalString: /К/g,
  symbolReplacementString: "K"
}, {
  symbolOriginalString: /М/g,
  symbolReplacementString: "M"
}, {
  symbolOriginalString: /Н/g,
  symbolReplacementString: "H"
}, {
  symbolOriginalString: /О/g,
  symbolReplacementString: "O"
}, {
  symbolOriginalString: /Р/g,
  symbolReplacementString: "P"
}, {
  symbolOriginalString: /С/g,
  symbolReplacementString: "C"
}, {
  symbolOriginalString: /Т/g,
  symbolReplacementString: "T"
}, {
  symbolOriginalString: /Х/g,
  symbolReplacementString: "X"
}, {
  symbolOriginalString: /Ѕ/g,
  symbolReplacementString: "S"
}, {
  symbolOriginalString: /Ј/g,
  symbolReplacementString: "J"
}, {
  symbolOriginalString: /а/g,
  symbolReplacementString: "a"
}, {
  symbolOriginalString: /е/g,
  symbolReplacementString: "e"
}, {
  symbolOriginalString: /о/g,
  symbolReplacementString: "o"
}, {
  symbolOriginalString: /р/g,
  symbolReplacementString: "p"
}, {
  symbolOriginalString: /с/g,
  symbolReplacementString: "c"
}, {
  symbolOriginalString: /у/g,
  symbolReplacementString: "y"
}, {
  symbolOriginalString: /х/g,
  symbolReplacementString: "x"
}, {
  symbolOriginalString: /ѕ/g,
  symbolReplacementString: "s"
}, {
  symbolOriginalString: /ј/g,
  symbolReplacementString: "j"
}, {
  symbolOriginalString: /і/g,
  symbolReplacementString: "i"
}, {
  symbolOriginalString: /І/g,
  symbolReplacementString: "I"
}];

// Create a client with our options
var client = new tmi.client(chatConfig);
var chatLogger = new tmi.client(chatConfig);

var chatConnectionStatus = {
  chat_logger_ready_state: chatLogger.readyState(),
  client_ready_state: client.readyState(),
  client_reconnect_attempts: clientReconnectAttempts,
  chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
  server_start_time: serverStartTime,
  server_current_time: new Date().getTime()
};

// Register our event handlers (defined below)
//client.on("ping", onPing);
client.on("raided", onRaid);
client.on("timeout", onTimeOut);
client.on("ban", onBan);
client.on("messagedeleted", onClearMsg);
client.on("message", onMessageHandler);
client.on("connected", onConnectedHandler);
client.on("raw_message", onRawMessageHandler);
//chatLogger.on("ping", onChatLoggerPing);
chatLogger.on("connected", onConnectedChatLoggerHandler);
chatLogger.on("raw_message", rawMessageLogger);
//chatLogger.on("timeout", onChatLoggerTimeOut);
//chatLogger.on("ban", onChatLoggerBan);
//chatLogger.on("messagedeleted", onChatLoggerClearMsg);

function onChatLoggerPing() {
  console.log(new Date().toISOString() + " [CHAT LOGGER PING] Received ping from server");
  chatLogger.raw("PONG");
}

function onPing() {
  console.log(new Date().toISOString() + " [MAIN BOT PING] Received ping from server");
  client.raw("PONG");
}

function onRaid(channel, username, viewers, tags) {
  let systemMsg = tags["system-msg"];
  systemMsg = systemMsg.replace(/(\\s)+/ig, " ");
  systemMsg = systemMsg.replace(/\s+/ig, " ");
  updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
  client.action(channel, systemMsg); // the tag system-msg is a message generated by the Twitch API which says how many people are raiding and what channel they're coming from
}

function onTimeOut(channel, msg, unused, duration, tags) {
  channel = channel.replace(/\#+/ig, "");
  msg = msg.replace(/(\\s)+/ig, "");
  msg = msg.replace(/\s+/ig, "");
  logTwitchModerationActionToDatabase("timeout", channel, null, msg, duration, null, tags, new Date().getTime());
  logTwitchModerationActionToTextFile("timeout", channel, null, msg, duration, null, tags, new Date().getTime());
  if (globalConfig.send_whispers_to_moderated_user == false) {
    return;
  }
  if (globalConfig.send_whispers_to_moderated_user == true) {
    updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
    sendTwitchWhisper(tags["target-user-id"], "You were timed out for " + duration + " seconds from " + channel + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
  }
}

function onBan(channel, msg, unused, tags) {
  channel = channel.replace(/\#+/ig, "");
  msg = msg.replace(/(\\s)+/ig, "");
  msg = msg.replace(/\s+/ig, "");
  logTwitchModerationActionToDatabase("ban", channel, null, msg, null, null, tags, new Date().getTime());
  logTwitchModerationActionToTextFile("ban", channel, null, msg, null, null, tags, new Date().getTime());
  if (globalConfig.send_whispers_to_moderated_user == false) {
    return;
  }
  if (globalConfig.send_whispers_to_moderated_user == true) {
    updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
    sendTwitchWhisper(tags["target-user-id"], "You were permanently banned from " + channel + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
  }
}

function onClearMsg(channel, username, deletedMessage, tags) {
  channel = channel.replace(/\#+/ig, "");
  username = username.replace(/(\\s)+/ig, "");
  username = username.replace(/\s+/ig, "");
  logTwitchModerationActionToDatabase("message_deleted", channel, username, null, null, deletedMessage, tags, new Date().getTime());
  logTwitchModerationActionToTextFile("message_deleted", channel, username, null, null, deletedMessage, tags, new Date().getTime());
  if (globalConfig.send_whispers_to_moderated_user == false) {
    return;
  }
  if (globalConfig.send_whispers_to_moderated_user == true) {
    // Can't send whispers from here anymore because Twitch doesn't expose the user ids for message deletion (CLEARMSG command). Why? Nobody knows. (Soon enough they'll do the same thing for ban and time out (CLEARCHAT command))
    //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
    //sendTwitchWhisper(tags["target-user-id"], "Your message was deleted from the channel " + channel + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
    //sendTwitchWhisper(tags["target-user-id"], "You sent: " + deletedMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
  }
}

function onChatLoggerTimeOut(channel, msg, unused, duration, tags) {
  channel = channel.replace(/\#+/ig, "");
  msg = msg.replace(/(\\s)+/ig, "");
  msg = msg.replace(/\s+/ig, "");
  logTwitchModerationActionToDatabase("timeout", channel, null, msg, duration, null, tags, new Date().getTime());
  logTwitchModerationActionToTextFile("timeout", channel, null, msg, duration, null, tags, new Date().getTime());
  if (globalConfig.send_whispers_to_moderated_user == false) {
    return;
  }
  if (globalConfig.send_whispers_to_moderated_user == true) {
    //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
    //sendTwitchWhisper(tags["target-user-id"], "You were timed out for " + duration + " seconds from " + channel + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
  }
}

function onChatLoggerBan(channel, msg, unused, tags) {
  channel = channel.replace(/\#+/ig, "");
  msg = msg.replace(/(\\s)+/ig, "");
  msg = msg.replace(/\s+/ig, "");
  logTwitchModerationActionToDatabase("ban", channel, null, msg, null, null, tags, new Date().getTime());
  logTwitchModerationActionToTextFile("ban", channel, null, msg, null, null, tags, new Date().getTime());
  if (globalConfig.send_whispers_to_moderated_user == false) {
    return;
  }
  if (globalConfig.send_whispers_to_moderated_user == true) {
    //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
    //sendTwitchWhisper(tags["target-user-id"], "You were permanently banned from " + channel + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
  }
}

function onChatLoggerClearMsg(channel, username, deletedMessage, tags) {
  channel = channel.replace(/\#+/ig, "");
  username = username.replace(/(\\s)+/ig, "");
  username = username.replace(/\s+/ig, "");
  logTwitchModerationActionToDatabase("message_deleted", channel, username, null, null, deletedMessage, tags, new Date().getTime());
  logTwitchModerationActionToTextFile("message_deleted", channel, username, null, null, deletedMessage, tags, new Date().getTime());
  if (globalConfig.send_whispers_to_moderated_user == false) {
    return;
  }
  if (globalConfig.send_whispers_to_moderated_user == true) {
    // Can't send whispers from here anymore because Twitch doesn't expose the user ids for message deletion (CLEARMSG command). Why? Nobody knows. (Soon enough they'll do the same thing for ban and time out (CLEARCHAT command))
    //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
    //sendTwitchWhisper(tags["target-user-id"], "Your message was deleted from the channel " + channel + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
    //sendTwitchWhisper(tags["target-user-id"], "You sent: " + deletedMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
  }
}


function rawMessageLogger(messageCloned, message) {
  chatConnectionStatus = {
    chat_logger_ready_state: chatLogger.readyState(),
    client_ready_state: client.readyState(),
    client_reconnect_attempts: clientReconnectAttempts,
    chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
    server_start_time: serverStartTime,
    server_current_time: new Date().getTime()
  };
  io.sockets.emit("chat_connection_status", chatConnectionStatus);
  if (chatConfig.log_chat_as_receiver == false) {
    //console.log("CHAT LOGGING IS DISABLED");
    return;
  }
  //console.log("CHAT LOGGING IS ENABLED");
  // This block logs chat from a viewer's (receiver only) point of view
  let rawLineMillis = new Date().getTime();
  let rawLineTimestamp = new Date(rawLineMillis).toISOString();
  let rawLineTimestampDate = new Date(rawLineMillis).getUTCDate();
  let rawLineTimestampMonth = new Date(rawLineMillis).getUTCMonth() + 1;
  let rawLineTimestampYear = new Date(rawLineMillis).getUTCFullYear();
  let chatLogDate = rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate;
  //console.log(__dirname + path.sep);

  //let dirName = __dirname + path.sep + "logs" + path.sep + "chat" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate;
  //let dirName = __dirname + path.sep + "logs" + path.sep + "whisper" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate;
  /*
  if (fs.existsSync(dirName) == false) {
    console.log("Create the folder");
    //fs.mkdirSync(dirName, { recursive: true });
  }
  */
  // messageCloned is the JSON converted to string
  // message is the raw, unmodified JSON
  let rawLineCommand = message.command;
  let rawLineParam0 = message.params[0];
  //rawLineParam0 = rawLineParam0.replace(/\#+/ig, "");
  let folderToMake = "";
  let chatLogFilename = "";
  let roomId = message.tags["room-id"];
  let userId = message.tags["user-id"];
  let threadId = message.tags["thread-id"]; // Used to keep track of whispers
  //rawLineParam0 = roomId;
  //console.log(rawLineTimestamp + " [RAW LINE PARAM0] " + rawLineParam0);
  if (message.params.length === 0) {
    rawLineParam0 = "";
  }
  //rawLineParam0 = rawLineParam0.replace(/\#+/ig, "");
  //console.log(rawLineTimestamp + " [RAW LINE PARAM0] " + rawLineParam0);
  //console.log(rawLineTimestamp + " [RAW LINE PARAM0] " + rawLineParam0);
  //console.log(rawLineTimestamp + " [RAW LINE COMMAND] " + rawLineCommand);
  // This block logs chat from a viewer's (receiver only) point of view
  // I have to do this because I need to listen and log all messages sent to chat, including messages sent by this application, as the receiver, not the sender
  // Is there a better way to do this without connecting two clients (having two instances of tmi.js running) to twitch?
  //console.log(rawLineTimestamp + " [RAW CHAT LINE]");
  //console.log(messageCloned);
  if (rawLineParam0 === "" || rawLineParam0 === undefined || rawLineParam0 === null || rawLineParam0 === "*") {
    return; // We don't want the first parameter to be an empty string, this param is either the channel name or the whisperer name, we don't want it to be undefined either, but it's possible that it is "undefined", we don't want it to be "*" because that's a twitch control line, and we don't want to log that
  }
  if (rawLineCommand === "PING" || rawLineCommand == "PONG" || rawLineCommand === "CAP" || rawLineCommand === "001" || rawLineCommand === "002" || rawLineCommand === "003" || rawLineCommand === "004" || rawLineCommand === "375" || rawLineCommand === "372" || rawLineCommand === "376" || rawLineCommand === "353" || rawLineCommand === "366" || rawLineCommand === "GLOBALUSERSTATE" || rawLineCommand === "USERSTATE" || rawLineCommand === "ROOMSTATE" || rawLineCommand === "PART" || rawLineCommand === "JOIN") {
    return; // Should I filter PART and JOIN? And maybe ROOMSTATE too? Yes, too much unecessary logging otherwise
  }
  rawLineParam0 = rawLineParam0.replace(/\#+/ig, "");
  //console.log(rawLineTimestamp + " [RAW CHAT LINE]");
  //console.log(message);
  if (rawLineCommand === "WHISPER") {
    // Doing this multiple times because I'm using an old version of node that doesn't support recursive folder creation (There was a reason for using this old version but I can't remember what, I think there were compatibility issues with either the serial port module or tmi.js module)
    folderToMake = __dirname + path.sep + "logs";
    if (fs.existsSync(folderToMake) == false) {
      console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder logs");
      fs.mkdirSync(folderToMake);
    }
    folderToMake = __dirname + path.sep + "logs" + path.sep + "receiver";
    if (fs.existsSync(folderToMake) == false) {
      console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder receiver");
      fs.mkdirSync(folderToMake);
    }
    folderToMake = __dirname + path.sep + "logs" + path.sep + "receiver" + path.sep + "whisper";
    if (fs.existsSync(folderToMake) == false) {
      console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder whisper");
      fs.mkdirSync(folderToMake);
    }
    folderToMake = __dirname + path.sep + "logs" + path.sep + "receiver" + path.sep + "whisper" + path.sep + rawLineTimestampYear;
    if (fs.existsSync(folderToMake) == false) {
      console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + rawLineTimestampYear);
      fs.mkdirSync(folderToMake);
    }
    folderToMake = __dirname + path.sep + "logs" + path.sep + "receiver" + path.sep + "whisper" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth;
    if (fs.existsSync(folderToMake) == false) {
      console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + rawLineTimestampMonth);
      fs.mkdirSync(folderToMake);
    }
    folderToMake = __dirname + path.sep + "logs" + path.sep + "receiver" + path.sep + "whisper" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate;
    if (fs.existsSync(folderToMake) == false) {
      console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + rawLineTimestampDate);
      fs.mkdirSync(folderToMake);
    }
    // And then we make the file
    chatLogFilename = __dirname + path.sep + "logs" + path.sep + "receiver" + path.sep + "whisper" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate + path.sep + userId + "_" + rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate + ".txt";
    if (fs.existsSync(chatLogFilename) == false) {
      console.log(new Date().toISOString() + " [FILE CREATION] Creating the file " + userId + "_" + rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate + ".txt");
      fs.writeFileSync(chatLogFilename, "", "utf8"); // Create an empty file with UTF-8 Encoding
    }
    // Then we append to the file
    chatLogFilename = __dirname + path.sep + "logs" + path.sep + "receiver" + path.sep + "whisper" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate + path.sep + userId + "_" + rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate + ".txt";
    if (fs.existsSync(chatLogFilename) == true) {
      //console.log(new Date().toISOString() + " [FILE WRITING] Append to the file");
      fs.appendFileSync(chatLogFilename, rawLineTimestamp + " " + JSON.stringify(message) + "\n", "utf8");
    }
    // And that's how you log twitch raw lines on an older version of nodejs
    return; // This case is a different case from the rest, whispers have to be logged separately
  }
  // Doing this multiple times because I'm using an old version of node that doesn't support recursive folder creation (There was a reason for using this old version but I can't remember what, I think there were compatibility issues with either the serial port module or tmi.js module)
  folderToMake = __dirname + path.sep + "logs";
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder logs");
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + "logs" + path.sep + "receiver";
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder receiver");
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + "logs" + path.sep + "receiver" + path.sep + "chat";
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder chat");
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + "logs" + path.sep + "receiver" + path.sep + "chat" + path.sep + rawLineTimestampYear;
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + rawLineTimestampYear);
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + "logs" + path.sep + "receiver" + path.sep + "chat" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth;
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + rawLineTimestampMonth);
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + "logs" + path.sep + "receiver" + path.sep + "chat" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate;
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + rawLineTimestampDate);
    fs.mkdirSync(folderToMake);
  }
  // And then we make the file
  chatLogFilename = __dirname + path.sep + "logs" + path.sep + "receiver" + path.sep + "chat" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate + path.sep + rawLineParam0.replace(/\#+/ig, "") + "_" + rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate + ".txt";
  if (fs.existsSync(chatLogFilename) == false) {
    console.log(new Date().toISOString() + " [FILE CREATION] Creating the file " + rawLineParam0.replace(/\#+/ig, "") + "_" + rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate + ".txt");
    fs.writeFileSync(chatLogFilename, "", "utf8"); // Create an empty file with UTF-8 Encoding
  }
  // Then we append to the file
  chatLogFilename = __dirname + path.sep + "logs" + path.sep + "receiver" + path.sep + "chat" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate + path.sep + rawLineParam0.replace(/\#+/ig, "") + "_" + rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate + ".txt";
  if (fs.existsSync(chatLogFilename) == true) {
    //console.log(new Date().toISOString() + " [FILE WRITING] Append to the file");
    fs.appendFileSync(chatLogFilename, rawLineTimestamp + " " + JSON.stringify(message) + "\n", "utf8");
  }
  // And that's how you log twitch raw lines on an older version of nodejs
  // How would I go about saving this to a mongo database?
  //console.log(rawLineTimestamp + " [RAW CHAT LINE]");
  //console.log(message);
  //console.log(new Date().toISOString() + " [rawMessageLogger CHAT READY STATES] chatLogger.readyState() = " + chatLogger.readyState() + " client.readyState() = " + client.readyState() + " clientReconnectAttempts = " + clientReconnectAttempts + " chatLoggerReconnectAttempts = " + chatLoggerReconnectAttempts);
  chatConnectionStatus = {
    chat_logger_ready_state: chatLogger.readyState(),
    client_ready_state: client.readyState(),
    client_reconnect_attempts: clientReconnectAttempts,
    chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
    server_start_time: serverStartTime,
    server_current_time: new Date().getTime()
  };
  io.sockets.emit("chat_connection_status", chatConnectionStatus);
}

function onRawMessageHandler(messageCloned, message) {
  chatConnectionStatus = {
    chat_logger_ready_state: chatLogger.readyState(),
    client_ready_state: client.readyState(),
    client_reconnect_attempts: clientReconnectAttempts,
    chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
    server_start_time: serverStartTime,
    server_current_time: new Date().getTime()
  };
  io.sockets.emit("chat_connection_status", chatConnectionStatus);
  if (chatConfig.log_chat_as_moderator == false) {
    //console.log("CHAT LOGGING IS DISABLED");
    return;
  }
  //console.log("CHAT LOGGING IS ENABLED");
  // This is where the bot's point of view logging should happen (basically logging chat twice but slightly different, also I'm doing this because I want to log moderation actions made by the bot itself, not by someone else who's not the bot, like what happens in the block rawMessageLogger)
  //console.log(messageCloned);
  //message = JSON.stringify(message);
  //console.log(message);
  //console.log(new Date().toISOString() + " [RAW CHAT LINE] " + message.raw);
  //console.log(new Date().toISOString() + " [RAW CHAT LINE] " + messageCloned.raw);

  //

  // This block logs chat from the bot's (sender (logging moderation messages), moderator and partial receiver (it can't see its own messages)) point of view
  let rawLineMillis = new Date().getTime();
  let rawLineTimestamp = new Date(rawLineMillis).toISOString();
  let rawLineTimestampDate = new Date(rawLineMillis).getUTCDate();
  let rawLineTimestampMonth = new Date(rawLineMillis).getUTCMonth() + 1;
  let rawLineTimestampYear = new Date(rawLineMillis).getUTCFullYear();
  let chatLogDate = rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate;
  //console.log(__dirname + path.sep);

  //let dirName = __dirname + path.sep + "logs" + path.sep + "chat" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate;
  //let dirName = __dirname + path.sep + "logs" + path.sep + "chat" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate;
  /*
  if (fs.existsSync(dirName) == false) {
    console.log("Create the folder");
    //fs.mkdirSync(dirName, { recursive: true });
  }
  */
  // messageCloned is the JSON converted to string
  // message is the raw, unmodified JSON
  let rawLineCommand = message.command;
  let rawLineParam0 = message.params[0];
  //rawLineParam0 = rawLineParam0.replace(/\#+/ig, "");
  let folderToMake = "";
  let chatLogFilename = "";
  let roomId = message.tags["room-id"];
  let userId = message.tags["user-id"];
  let threadId = message.tags["thread-id"]; // Used to keep track of whispers
  //rawLineParam0 = roomId;
  //console.log(rawLineTimestamp + " [RAW LINE PARAM0] " + rawLineParam0);
  if (message.params.length === 0) {
    rawLineParam0 = "";
  }
  //rawLineParam0 = rawLineParam0.replace(/\#+/ig, "");
  //console.log(rawLineTimestamp + " [RAW LINE PARAM0] " + rawLineParam0);
  //console.log(rawLineTimestamp + " [RAW LINE PARAM0] " + rawLineParam0);
  //console.log(rawLineTimestamp + " [RAW LINE COMMAND] " + rawLineCommand);
  // This block logs chat from the bot's (sender (logging moderation messages), moderator and partial receiver (it can't see its own messages)) point of view
  // I have to do this because I need to listen and log all messages sent to chat, including messages sent by this application, as the receiver, not the sender (disregard this, this is a copypaste)
  // Is there a better way to do this without connecting two clients (having two instances of tmi.js running) to twitch?
  //console.log(rawLineTimestamp + " [RAW CHAT LINE]");
  //console.log(messageCloned);
  if (rawLineParam0 === "" || rawLineParam0 === undefined || rawLineParam0 === null || rawLineParam0 === "*") {
    return; // We don't want the first parameter to be an empty string, this param is either the channel name or the whisperer name, we don't want it to be undefined either, but it's possible that it is "undefined", we don't want it to be "*" because that's a twitch control line, and we don't want to log that
  }
  if (rawLineCommand === "PING" || rawLineCommand == "PONG" || rawLineCommand === "CAP" || rawLineCommand === "001" || rawLineCommand === "002" || rawLineCommand === "003" || rawLineCommand === "004" || rawLineCommand === "375" || rawLineCommand === "372" || rawLineCommand === "376" || rawLineCommand === "353" || rawLineCommand === "366" || rawLineCommand === "GLOBALUSERSTATE" || rawLineCommand === "USERSTATE" || rawLineCommand === "ROOMSTATE" || rawLineCommand === "PART" || rawLineCommand === "JOIN") {
    return; // Should I filter PART and JOIN? And maybe ROOMSTATE too? Yes, too much unecessary logging otherwise
  }
  rawLineParam0 = rawLineParam0.replace(/\#+/ig, "");
  //console.log(rawLineTimestamp + " [RAW CHAT LINE]");
  //console.log(message);
  if (rawLineCommand === "WHISPER") {
    // Doing this multiple times because I'm using an old version of node that doesn't support recursive folder creation (There was a reason for using this old version but I can't remember what, I think there were compatibility issues with either the serial port module or tmi.js module)
    folderToMake = __dirname + path.sep + "logs";
    if (fs.existsSync(folderToMake) == false) {
      console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder logs");
      fs.mkdirSync(folderToMake);
    }
    folderToMake = __dirname + path.sep + "logs" + path.sep + "moderator";
    if (fs.existsSync(folderToMake) == false) {
      console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder moderator");
      fs.mkdirSync(folderToMake);
    }
    folderToMake = __dirname + path.sep + "logs" + path.sep + "moderator" + path.sep + "whisper";
    if (fs.existsSync(folderToMake) == false) {
      console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder whisper");
      fs.mkdirSync(folderToMake);
    }
    folderToMake = __dirname + path.sep + "logs" + path.sep + "moderator" + path.sep + "whisper" + path.sep + rawLineTimestampYear;
    if (fs.existsSync(folderToMake) == false) {
      console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + rawLineTimestampYear);
      fs.mkdirSync(folderToMake);
    }
    folderToMake = __dirname + path.sep + "logs" + path.sep + "moderator" + path.sep + "whisper" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth;
    if (fs.existsSync(folderToMake) == false) {
      console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + rawLineTimestampMonth);
      fs.mkdirSync(folderToMake);
    }
    folderToMake = __dirname + path.sep + "logs" + path.sep + "moderator" + path.sep + "whisper" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate;
    if (fs.existsSync(folderToMake) == false) {
      console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + rawLineTimestampDate);
      fs.mkdirSync(folderToMake);
    }
    // And then we make the file
    chatLogFilename = __dirname + path.sep + "logs" + path.sep + "moderator" + path.sep + "whisper" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate + path.sep + userId + "_" + rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate + ".txt";
    if (fs.existsSync(chatLogFilename) == false) {
      console.log(new Date().toISOString() + " [FILE CREATION] Creating the file " + userId + "_" + rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate + ".txt");
      fs.writeFileSync(chatLogFilename, "", "utf8"); // Create an empty file with UTF-8 Encoding
    }
    // Then we append to the file
    chatLogFilename = __dirname + path.sep + "logs" + path.sep + "moderator" + path.sep + "whisper" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate + path.sep + userId + "_" + rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate + ".txt";
    if (fs.existsSync(chatLogFilename) == true) {
      //console.log(new Date().toISOString() + " [FILE WRITING] Append to the file");
      fs.appendFileSync(chatLogFilename, rawLineTimestamp + " " + JSON.stringify(message) + "\n", "utf8");
    }
    // And that's how you log twitch raw lines on an older version of nodejs
    return; // This case is a different case from the rest, whispers have to be logged separately
  }
  // Doing this multiple times because I'm using an old version of node that doesn't support recursive folder creation (There was a reason for using this old version but I can't remember what, I think there were compatibility issues with either the serial port module or tmi.js module)
  folderToMake = __dirname + path.sep + "logs";
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder logs");
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + "logs" + path.sep + "moderator";
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder moderator");
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + "logs" + path.sep + "moderator" + path.sep + "chat";
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder chat");
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + "logs" + path.sep + "moderator" + path.sep + "chat" + path.sep + rawLineTimestampYear;
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + rawLineTimestampYear);
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + "logs" + path.sep + "moderator" + path.sep + "chat" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth;
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + rawLineTimestampMonth);
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + "logs" + path.sep + "moderator" + path.sep + "chat" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate;
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + rawLineTimestampDate);
    fs.mkdirSync(folderToMake);
  }
  // And then we make the file
  chatLogFilename = __dirname + path.sep + "logs" + path.sep + "moderator" + path.sep + "chat" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate + path.sep + rawLineParam0.replace(/\#+/ig, "") + "_" + rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate + ".txt";
  if (fs.existsSync(chatLogFilename) == false) {
    console.log(new Date().toISOString() + " [FILE CREATION] Creating the file " + rawLineParam0.replace(/\#+/ig, "") + "_" + rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate + ".txt");
    fs.writeFileSync(chatLogFilename, "", "utf8"); // Create an empty file with UTF-8 Encoding
  }
  // Then we append to the file
  chatLogFilename = __dirname + path.sep + "logs" + path.sep + "moderator" + path.sep + "chat" + path.sep + rawLineTimestampYear + path.sep + rawLineTimestampMonth + path.sep + rawLineTimestampDate + path.sep + rawLineParam0.replace(/\#+/ig, "") + "_" + rawLineTimestampYear + "-" + rawLineTimestampMonth + "-" + rawLineTimestampDate + ".txt";
  if (fs.existsSync(chatLogFilename) == true) {
    //console.log(new Date().toISOString() + " [FILE WRITING] Append to the file");
    fs.appendFileSync(chatLogFilename, rawLineTimestamp + " " + JSON.stringify(message) + "\n", "utf8");
  }
  // And that's how you log twitch raw lines on an older version of nodejs
  // How would I go about saving this to a mongo database?
  //console.log(rawLineTimestamp + " [RAW CHAT LINE]");
  //console.log(message);
  //console.log(new Date().toISOString() + " [onRawMessageHandler CHAT READY STATES] chatLogger.readyState() = " + chatLogger.readyState() + " client.readyState() = " + client.readyState() + " clientReconnectAttempts = " + clientReconnectAttempts + " chatLoggerReconnectAttempts = " + chatLoggerReconnectAttempts);
  chatConnectionStatus = {
    chat_logger_ready_state: chatLogger.readyState(),
    client_ready_state: client.readyState(),
    client_reconnect_attempts: clientReconnectAttempts,
    chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
    server_start_time: serverStartTime,
    server_current_time: new Date().getTime()
  };
  io.sockets.emit("chat_connection_status", chatConnectionStatus);
}
//client.connect();
// Connect to Twitch:
if (client.readyState() === "CLOSED") {
  console.log(new Date().toISOString() + " [checkChatConnection A CHAT READY STATES] chatLogger.readyState() = " + chatLogger.readyState() + " client.readyState() = " + client.readyState() + " clientReconnectAttempts = " + clientReconnectAttempts + " chatLoggerReconnectAttempts = " + chatLoggerReconnectAttempts);
  chatConnectionStatus = {
    chat_logger_ready_state: chatLogger.readyState(),
    client_ready_state: client.readyState(),
    client_reconnect_attempts: clientReconnectAttempts,
    chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
    server_start_time: serverStartTime,
    server_current_time: new Date().getTime()
  };
  io.sockets.emit("chat_connection_status", chatConnectionStatus);
  client.connect();
  chatConnectionStatus = {
    chat_logger_ready_state: chatLogger.readyState(),
    client_ready_state: client.readyState(),
    client_reconnect_attempts: clientReconnectAttempts,
    chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
    server_start_time: serverStartTime,
    server_current_time: new Date().getTime()
  };
  io.sockets.emit("chat_connection_status", chatConnectionStatus);
}
if (chatLogger.readyState() === "CLOSED") {
  if (chatConfig.log_chat_as_receiver == true) {
    console.log(new Date().toISOString() + " [checkChatConnection B CHAT READY STATES] chatLogger.readyState() = " + chatLogger.readyState() + " client.readyState() = " + client.readyState() + " clientReconnectAttempts = " + clientReconnectAttempts + " chatLoggerReconnectAttempts = " + chatLoggerReconnectAttempts);
    chatConnectionStatus = {
      chat_logger_ready_state: chatLogger.readyState(),
      client_ready_state: client.readyState(),
      client_reconnect_attempts: clientReconnectAttempts,
      chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
      server_start_time: serverStartTime,
      server_current_time: new Date().getTime()
    };
    io.sockets.emit("chat_connection_status", chatConnectionStatus);
    chatLogger.connect();
    chatConnectionStatus = {
      chat_logger_ready_state: chatLogger.readyState(),
      client_ready_state: client.readyState(),
      client_reconnect_attempts: clientReconnectAttempts,
      chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
      server_start_time: serverStartTime,
      server_current_time: new Date().getTime()
    };
    io.sockets.emit("chat_connection_status", chatConnectionStatus);
  }
}

//generateTwitchOAuthToken(twitchCredentials);

function generateTwitchOAuthToken(twitchCredentialsObject) {
  if (twitchCredentialsObject.use_twitch_api == false) {
    return;
  }
  // This function should only be called when the server starts to generate a new OAuth 2.0 Token
  // According to the Twitch API Documentation, this is the wrong way for refreshing an OAuth 2.0 Token, but it works
  console.log(new Date().toISOString() + " Attempting to generate new Twitch OAuth 2.0 Token! A");
  let rawOutputData = "";
  let twitchClientId = twitchCredentialsObject.twitch_client_id;
  let twitchClientSecret = twitchCredentialsObject.twitch_client_secret;
  let twitchGrantType = "client_credentials";
  let twitchScopes = twitchCredentialsObject.twitch_scopes;
  let httpsOptions = {
    hostname: "id.twitch.tv",
    path: "/oauth2/token?" + "client_id=" + twitchClientId + "&client_secret=" + twitchClientSecret + "&grant_type=" + twitchGrantType + "&scope=" + twitchScopes,
    method: "POST"
  };
  let twitchRequest = https.request(httpsOptions, function(res) {
    console.log(new Date().toISOString() + " Attempting to generate new Twitch OAuth 2.0 Token! B");
    console.log("TWITCH OAUTH TOKEN GENERATION statusCode: " + res.statusCode);
    //console.log(res);
    res.on("data", function(d) {
      //console.log(new Date().toISOString() + " Did it work?");
      rawOutputData = rawOutputData + d.toString("utf8");
    });
    res.on("end", function() {
      if (res.statusCode < 200 || res.statusCode > 299) {
        console.log(new Date().toISOString() + " TWITCH OAUTH TOKEN GENERATION RESPONSE ERROR res.statusCode = " + res.statusCode);
        console.log(rawOutputData.toString("utf8"));
      }
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        let outputData = JSON.parse(rawOutputData.toString("utf8"));
        twitchJsonEncodedAppAccessToken = outputData;
        console.log(new Date().toISOString() + " Was the token generated? Check below");
        console.log(twitchJsonEncodedAppAccessToken);
        getTwitchTokenStatus(twitchJsonEncodedAppAccessToken);
      }
    });
  });
  twitchRequest.on("error", function(error) {
    console.log(new Date().toISOString() + " TWITCH OAUTH TOKEN GENERATION CONNECTION ERROR");
    console.error(error);
  });
  twitchRequest.end();
  console.log(new Date().toISOString() + " Was the token generated?");
}

//generateTwitchBotOAuthToken(twitchCredentials);

function generateTwitchBotOAuthToken(twitchCredentialsObject) {
  if (twitchCredentialsObject.use_twitch_api == false) {
    return;
  }
  // This function should only be called when the server starts to generate a new OAuth 2.0 Token
  // According to the Twitch API Documentation, this is the wrong way for refreshing an OAuth 2.0 Token, but it works
  console.log(new Date().toISOString() + " Attempting to generate new Twitch Bot OAuth 2.0 Token! A");
  let rawOutputData = "";
  let twitchBotClientId = twitchCredentialsObject.twitch_bot_client_id;
  let twitchBotClientSecret = twitchCredentialsObject.twitch_bot_client_secret;
  let twitchGrantType = "client_credentials";
  let twitchScopes = twitchCredentialsObject.twitch_bot_scopes;
  let httpsOptions = {
    hostname: "id.twitch.tv",
    path: "/oauth2/token?" + "client_id=" + twitchBotClientId + "&client_secret=" + twitchBotClientSecret + "&grant_type=" + twitchGrantType + "&scope=" + twitchScopes,
    method: "POST"
  };
  let twitchRequest = https.request(httpsOptions, function(res) {
    console.log(new Date().toISOString() + " Attempting to generate new Twitch Bot OAuth 2.0 Token! B");
    console.log("TWITCH OAUTH BOT TOKEN GENERATION statusCode: " + res.statusCode);
    //console.log(res);
    res.on("data", function(d) {
      //console.log(new Date().toISOString() + " Did it work?");
      rawOutputData = rawOutputData + d.toString("utf8");
    });
    res.on("end", function() {
      if (res.statusCode < 200 || res.statusCode > 299) {
        console.log(new Date().toISOString() + " TWITCH OAUTH BOT TOKEN GENERATION RESPONSE ERROR res.statusCode = " + res.statusCode);
        console.log(rawOutputData.toString("utf8"));
      }
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        let outputData = JSON.parse(rawOutputData.toString("utf8"));
        twitchJsonEncodedBotAppAccessToken = outputData;
        console.log(new Date().toISOString() + " Was the bot token generated? Check below");
        console.log(twitchJsonEncodedBotAppAccessToken);
        getTwitchBotTokenStatus(twitchJsonEncodedBotAppAccessToken);
      }
    });
  });
  twitchRequest.on("error", function(error) {
    console.log(new Date().toISOString() + " TWITCH OAUTH BOT TOKEN GENERATION CONNECTION ERROR");
    console.error(error);
  });
  twitchRequest.end();
  console.log(new Date().toISOString() + " Was the bot token generated?");
}

function updateTwitchUserRandomChatColor(twitchCredentialsObject, twitchAccessTokenObject) {
  if (twitchCredentialsObject.use_twitch_api == false) {
    return;
  }
  if (chatConfig.change_user_color_before_sending_message == false) {
    return;
  }
  let randomColorName = Math.floor(Math.random() * defaultColors.length);
  let newUserChatColor = defaultColorNames[randomColorName];
  //console.log("Attempting to RANDOMLY update user color to: " + newUserChatColor);
  let rawOutputData = "";
  let twitchBotClientId = twitchCredentialsObject.twitch_bot_client_id;
  let twitchBotId = twitchCredentialsObject.twitch_bot_channel_id;
  let twitchBotOauthToken = twitchCredentialsObject.twitch_bot_oauth_access_token;
  let options = {
    hostname: "api.twitch.tv",
    path: "/helix/chat/color?user_id=" + twitchBotId + "&color=" + newUserChatColor,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + twitchBotOauthToken,
      "Client-Id": twitchBotClientId
    }
  };
  let req = https.request(options, function(res) {
    //console.log("USER COLOR statusCode: " + res.statusCode);
    res.on("data", function(d) {
      //console.log("USER COLOR DATA RECEIVED");
      //console.log(d.toString("utf8"));
      rawOutputData = rawOutputData + d.toString("utf8");
      //console.log(JSON.parse(d.toString("utf8")));
      //process.stdout.write(d);
      //console.log(d);
    });
    res.on("end", function() {
      if (res.statusCode < 200 || res.statusCode > 299) {
        console.log(new Date().toISOString() + " USER COLOR RESPONSE ERROR res.statusCode = " + res.statusCode);
        console.log(rawOutputData.toString("utf8"));
      }
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        //console.log("USER COLOR END");
        //console.log(JSON.parse(rawOutputData.toString("utf8")));
        //console.log(rawOutputData.toString("utf8"));
        //console.log("I'm not sure if the user color was updated or not, look above for any error messages!");
        //getTwitchBotTokenStatus(twitchCredentialsObject);
      }
    });
  });
  req.on("error", function(error) {
    console.log(new Date().toISOString() + " USER COLOR CONNECTION ERROR");
    console.error(error);
  });
  req.end();
}

function updateTwitchUserChatColor(newUserChatColor, twitchCredentialsObject, twitchAccessTokenObject) {
  if (twitchCredentialsObject.use_twitch_api == false) {
    return;
  }
  if (chatConfig.change_user_color_before_sending_message == false) {
    return;
  }
  //console.log("Attempting to update user color to: " + newUserChatColor);
  let rawOutputData = "";
  let twitchBotClientId = twitchCredentialsObject.twitch_bot_client_id;
  let twitchBotId = twitchCredentialsObject.twitch_bot_channel_id;
  let twitchBotOauthToken = twitchCredentialsObject.twitch_bot_oauth_access_token;
  let options = {
    hostname: "api.twitch.tv",
    path: "/helix/chat/color?user_id=" + twitchBotId + "&color=" + newUserChatColor,
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + twitchBotOauthToken,
      "Client-Id": twitchBotClientId
    }
  };
  let req = https.request(options, function(res) {
    //console.log("USER COLOR statusCode: " + res.statusCode);
    res.on("data", function(d) {
      //console.log("USER COLOR DATA RECEIVED");
      //console.log(d.toString("utf8"));
      rawOutputData = rawOutputData + d.toString("utf8");
      //console.log(JSON.parse(d.toString("utf8")));
      //process.stdout.write(d);
      //console.log(d);
    });
    res.on("end", function() {
      if (res.statusCode < 200 || res.statusCode > 299) {
        console.log(new Date().toISOString() + " USER COLOR RESPONSE ERROR res.statusCode = " + res.statusCode);
        console.log(rawOutputData.toString("utf8"));
      }
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        //console.log("USER COLOR END");
        //console.log(JSON.parse(rawOutputData.toString("utf8")));
        //console.log(rawOutputData.toString("utf8"));
        //console.log("I'm not sure if the user color was updated or not, look above for any error messages!");
        //getTwitchBotTokenStatus(twitchCredentialsObject);
      }
    });
  });
  req.on("error", function(error) {
    console.log(new Date().toISOString() + " USER COLOR CONNECTION ERROR");
    console.error(error);
  });
  req.end();
}

function getTwitchUserFollowingChannelStatus(broadcasterId, userId, username, channel, msgId, twitchCredentialsObject, twitchAccessTokenObject) {
  if (twitchCredentialsObject.use_twitch_api == false) {
    return;
  }
  //console.log("Attempting to get follow status for user " + userId + " on channel " + broadcasterId);
  channel = channel.replace(/\#+/ig, "");
  let rawOutputData = "";
  let twitchBotClientId = twitchCredentialsObject.twitch_bot_client_id;
  let twitchBotId = twitchCredentialsObject.twitch_bot_channel_id;
  let twitchBotOauthToken = twitchCredentialsObject.twitch_bot_oauth_access_token;
  let userFollowedAt = "";
  let userFollowedAtMillis = 0;
  let options = {
    hostname: "api.twitch.tv",
    path: "/helix/channels/followers?broadcaster_id=" + broadcasterId + "&user_id=" + userId,
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + twitchBotOauthToken,
      "Client-Id": twitchBotClientId
    }
  };
  let req = https.request(options, function(res) {
    //console.log("FOLLOW STATUS statusCode: " + res.statusCode);
    res.on("data", function(d) {
      //console.log("FOLLOW STATUS DATA RECEIVED");
      //console.log(d.toString("utf8"));
      rawOutputData = rawOutputData + d.toString("utf8");
      //console.log(JSON.parse(d.toString("utf8")));
      //process.stdout.write(d);
      //console.log(d);
    });
    res.on("end", function() {
      if (res.statusCode < 200 || res.statusCode > 299) {
        console.log(rawOutputData.toString("utf8"));
        if (client.readyState() === "OPEN") {
          updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
          client.reply(channel, "@" + username + " Error getting your follow status for " + channel + ".", msgId);
        }
      }
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        let dataArray = JSON.parse(rawOutputData.toString("utf8")).data;
        if (dataArray === "" || dataArray === undefined || dataArray === null || dataArray === [] || dataArray === "[]" || dataArray === "null" || dataArray === "undefined") {
          //console.log("INVALID RESPONSE");
          if (client.readyState() === "OPEN") {
            updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            client.reply(channel, "@" + username + " Error getting your follow status for " + channel + ".", msgId);
          }
        }
        if (dataArray !== "" && dataArray !== undefined && dataArray !== null && dataArray !== [] && dataArray !== "[]" && dataArray !== "null" && dataArray !== "undefined") {
          //console.log("VALID RESPONSE PogChamp PogChamp PogChamp PogChamp PogChamp PogChamp PogChamp PogChamp PogChamp PogChamp PogChamp PogChamp");
          let dataSize = dataArray.length;
          //console.log(" dataSize = " + dataSize);
          //console.log("FOLLOW STATUS END");
          //console.log(JSON.parse(rawOutputData.toString("utf8")));
          //console.log(rawOutputData.toString("utf8"));
          //console.log("I'm not sure if the follow status response worked or not, look above for any error messages!");
          if (dataSize > 0) {
            userFollowedAt = dataArray[0].followed_at;
            userFollowedAtMillis = Date.parse(userFollowedAt);
            //console.log(userFollowedAt);
            //console.log(userFollowedAtMillis);
            let currentTime = new Date().getTime();
            let userFollowTimeDelta = currentTime - userFollowedAtMillis;
            let userFollowTimeYears = (parseInt(userFollowTimeDelta / 31557600000)).toString(); // 31557600000 is 365.25 days in milliseconds
            let userFollowTimeDays = (parseInt(userFollowTimeDelta / 86400000) % 365.25).toString(); // One year has about 365.25 days
            userFollowTimeDays = parseInt(userFollowTimeDays);
            let userFollowTimeHours = (parseInt(userFollowTimeDelta / 3600000) % 24).toString().padStart(2, "0");
            let userFollowTimeMinutes = (parseInt(userFollowTimeDelta / 60000) % 60).toString().padStart(2, "0");
            let userFollowTimeSeconds = (parseInt(userFollowTimeDelta / 1000) % 60).toString().padStart(2, "0");
            let userFollowTimeMillis = (userFollowTimeDelta % 1000).toString().padStart(3, "0");
            let userFollowTimeString = userFollowTimeYears + "yr " + userFollowTimeDays + "day " + userFollowTimeHours + "hour " + userFollowTimeMinutes + "min " + userFollowTimeSeconds + "sec " + userFollowTimeMillis + "msec";
            if (client.readyState() === "OPEN") {
              updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              client.reply(channel, "@" + username + " You have been following " + channel + " for " + userFollowTimeString + ". You have been following since " + userFollowedAt + ". The time is " + new Date(currentTime).toISOString() + ".", msgId);
            }
          }
          if (dataSize <= 0) {
            if (client.readyState() === "OPEN") {
              updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              client.reply(channel, "@" + username + " You're not following " + channel + ".", msgId);
            }
          }
        }
      }
    });
  });
  req.on("error", function(error) {
    if (client.readyState() === "OPEN") {
      updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
      client.reply(channel, "@" + username + " Error getting your follow status for " + channel + ".", msgId);
    }
    console.log(new Date().toISOString() + " FOLLOW STATUS CONNECTION ERROR");
    console.error(error);
  });
  req.end();
}

function getTwitchStreamStatus(broadcasterId, userId, username, channel, msgId, twitchCredentialsObject, twitchAccessTokenObject, isDataRequestedFromOverlay, overlayClientSocketId, timeStreamStatusWasRequested) {
  if (twitchCredentialsObject.use_twitch_api == false) {
    return;
  }
  let timeUptimeWasRequested = new Date().getTime();
  channel = channel.replace(/\#+/ig, "");
  let rawOutputData = "";
  let twitchBotClientId = twitchCredentialsObject.twitch_bot_client_id;
  let twitchBotId = twitchCredentialsObject.twitch_bot_channel_id;
  let twitchBotOauthToken = twitchCredentialsObject.twitch_bot_oauth_access_token;
  let streamStatusStartedAt = "";
  let streamStatusStartedAtMillis = 0;
  let streamStatusViewerCount = 0;
  let twitchApiStatusCode = -1;
  let uptimeTotal = timeUptimeWasRequested - serverStartTime; // THIS IS THE MODBOT'S UPTIME NOT THE STREAM UPTIME
  let streamStatusToSendToOverlay = {
    time_server_received_twitch_stream_status_request: timeStreamStatusWasRequested.time_server_received_twitch_stream_status_request,
    time_overlay_requested_twitch_stream_status: timeStreamStatusWasRequested.time_overlay_requested_twitch_stream_status,
    overlay_to_server_time_drift_millis: timeStreamStatusWasRequested.overlay_to_server_time_drift_millis,
    server_current_time: new Date().getTime(),
    stream_status_started_at: streamStatusStartedAt,
    stream_status_started_at_millis: streamStatusStartedAtMillis,
    stream_status_viewer_count: streamStatusViewerCount,
    twitch_api_status_code: twitchApiStatusCode,
    time_uptime_was_requested: timeUptimeWasRequested,
    uptime_total: uptimeTotal,
    server_start_time: serverStartTime,
    server_start_time_string: new Date(serverStartTime).toISOString(),
    is_stream_live: false,
    uptime_string: "",
    stream_status_delta_uptime: 0,
    stream_status_uptime_string: "",
    twitch_channel_status_raw_response: {}
  };
  let options = {
    hostname: "api.twitch.tv",
    path: "/helix/streams?user_id=" + broadcasterId,
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + twitchBotOauthToken,
      "Client-Id": twitchBotClientId
    }
  };
  let req = https.request(options, function(res) {
    //console.log("statusCode: " + res.statusCode);
    twitchApiStatusCode = res.statusCode;
    res.on("data", function(d) {
      //console.log(JSON.parse(d.toString("utf8")));
      rawOutputData = rawOutputData + d.toString("utf8");
    });
    res.on("end", function() {
      if (res.statusCode < 200 || res.statusCode > 299) {
        console.log(rawOutputData.toString("utf8"));
        if (isDataRequestedFromOverlay == false) {
          if (client.readyState() === "OPEN") {
            updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            client.reply(channel, "@" + username + " Error getting stream uptime for " + channel + ".", msgId);
          }
        }
        if (isDataRequestedFromOverlay == true) {
          // uhh idk send data saying stream is offline to the overlay (or maybe not send anything)
          streamStatusToSendToOverlay = {
            time_server_received_twitch_stream_status_request: timeStreamStatusWasRequested.time_server_received_twitch_stream_status_request,
            time_overlay_requested_twitch_stream_status: timeStreamStatusWasRequested.time_overlay_requested_twitch_stream_status,
            overlay_to_server_time_drift_millis: timeStreamStatusWasRequested.overlay_to_server_time_drift_millis,
            server_current_time: new Date().getTime(),
            stream_status_started_at: streamStatusStartedAt,
            stream_status_started_at_millis: streamStatusStartedAtMillis,
            stream_status_viewer_count: streamStatusViewerCount,
            twitch_api_status_code: twitchApiStatusCode,
            time_uptime_was_requested: timeUptimeWasRequested,
            uptime_total: uptimeTotal,
            server_start_time: serverStartTime,
            server_start_time_string: new Date(serverStartTime).toISOString(),
            is_stream_live: false,
            uptime_string: "",
            stream_status_delta_uptime: 0,
            stream_status_uptime_string: "",
            twitch_channel_status_raw_response: {}
          };
          //io.to(overlayClientSocketId).emit("stream_status", streamStatusToSendToOverlay); // Todo: send proper data to the overlay (eg: processed data as well as raw data from twitch)
        }
      }
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        let dataArray = JSON.parse(rawOutputData.toString("utf8")).data;
        if (dataArray === "" || dataArray === undefined || dataArray === null || dataArray === [] || dataArray === "[]" || dataArray === "null" || dataArray === "undefined") {
          //console.log("INVALID RESPONSE");
          if (isDataRequestedFromOverlay == false) {
            if (client.readyState() === "OPEN") {
              updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              client.reply(channel, "@" + username + " Error getting stream uptime for " + channel + ".", msgId);
            }
          }
          if (isDataRequestedFromOverlay == true) {
            // uhh idk send data saying stream is offline to the overlay (or maybe not send anything)
            streamStatusToSendToOverlay = {
              time_server_received_twitch_stream_status_request: timeStreamStatusWasRequested.time_server_received_twitch_stream_status_request,
              time_overlay_requested_twitch_stream_status: timeStreamStatusWasRequested.time_overlay_requested_twitch_stream_status,
              overlay_to_server_time_drift_millis: timeStreamStatusWasRequested.overlay_to_server_time_drift_millis,
              server_current_time: new Date().getTime(),
              stream_status_started_at: streamStatusStartedAt,
              stream_status_started_at_millis: streamStatusStartedAtMillis,
              stream_status_viewer_count: streamStatusViewerCount,
              twitch_api_status_code: twitchApiStatusCode,
              time_uptime_was_requested: timeUptimeWasRequested,
              uptime_total: uptimeTotal,
              server_start_time: serverStartTime,
              server_start_time_string: new Date(serverStartTime).toISOString(),
              is_stream_live: false,
              uptime_string: "",
              stream_status_delta_uptime: 0,
              stream_status_uptime_string: "",
              twitch_channel_status_raw_response: {}
            };
            //io.to(overlayClientSocketId).emit("stream_status", streamStatusToSendToOverlay);
          }
        }
        if (dataArray !== "" && dataArray !== undefined && dataArray !== null && dataArray !== [] && dataArray !== "[]" && dataArray !== "null" && dataArray !== "undefined") {
          //console.log("VALID RESPONSE POGCHAMP VALID RESPONSE POGCHAMP VALID RESPONSE POGCHAMP VALID RESPONSE POGCHAMP VALID RESPONSE POGCHAMP VALID RESPONSE POGCHAMP VALID RESPONSE POGCHAMP VALID RESPONSE POGCHAMP VALID RESPONSE POGCHAMP VALID RESPONSE POGCHAMP VALID RESPONSE POGCHAMP VALID RESPONSE POGCHAMP");
          //console.log(JSON.parse(rawOutputData.toString("utf8")));
          let dataSize = dataArray.length;
          //console.log(" dataSize = " + dataSize);
          if (dataSize > 0) {
            // The stream is LIVE!
            //console.log(JSON.parse(rawOutputData.toString("utf8")).data[0]);
            streamStatusViewerCount = dataArray[0].viewer_count;
            streamStatusStartedAt = dataArray[0].started_at;
            streamStatusStartedAtMillis = Date.parse(streamStatusStartedAt);
            let uptimeDays = (parseInt(uptimeTotal / 86400000)).toString().padStart(2, "0");
            let uptimeHours = (parseInt(uptimeTotal / 3600000) % 24).toString().padStart(2, "0");
            let uptimeMinutes = (parseInt(uptimeTotal / 60000) % 60).toString().padStart(2, "0");
            let uptimeSeconds = (parseInt(uptimeTotal / 1000) % 60).toString().padStart(2, "0");
            let uptimeMillis = (uptimeTotal % 1000).toString().padStart(3, "0");
            let uptimeString = uptimeDays + "day " + uptimeHours + "hour " + uptimeMinutes + "min " + uptimeSeconds + "sec " + uptimeMillis + "msec";
            let uptimeString2 = uptimeDays + "d " + uptimeHours + "h " + uptimeMinutes + "m " + uptimeSeconds + "s " + uptimeMillis + "ms";
            //
            let streamStatusDeltaUptime = timeUptimeWasRequested - streamStatusStartedAtMillis;
            let streamStatusUptimeDays = (parseInt(streamStatusDeltaUptime / 86400000)).toString().padStart(2, "0");
            let streamStatusUptimeHours = (parseInt(streamStatusDeltaUptime / 3600000) % 24).toString().padStart(2, "0");
            let streamStatusUptimeMinutes = (parseInt(streamStatusDeltaUptime / 60000) % 60).toString().padStart(2, "0");
            let streamStatusUptimeSeconds = (parseInt(streamStatusDeltaUptime / 1000) % 60).toString().padStart(2, "0");
            let streamStatusUptimeMillis = (streamStatusDeltaUptime % 1000).toString().padStart(3, "0");
            let streamStatusUptimeString = streamStatusUptimeDays + "day " + streamStatusUptimeHours + "hour " + streamStatusUptimeMinutes + "min " + streamStatusUptimeSeconds + "sec " + streamStatusUptimeMillis + "msec";
            let streamStatusUptimeString2 = streamStatusUptimeDays + "d " + streamStatusUptimeHours + "h " + streamStatusUptimeMinutes + "m " + streamStatusUptimeSeconds + "s " + streamStatusUptimeMillis + "ms";
            //
            if (isDataRequestedFromOverlay == false) {
              if (client.readyState() === "OPEN") {
                updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                client.reply(channel, "@" + username + " The time is " + new Date(timeUptimeWasRequested).toISOString() + ". The modbot has been up for " + uptimeString + ". The modbot has been up since " + new Date(serverStartTime).toISOString() + ". " + channel + "\'s stream has been up for " + streamStatusUptimeString + ". " + channel + "\'s stream started at " + streamStatusStartedAt + ". There are " + streamStatusViewerCount + " viewers.", msgId);
              }
            }
            if (isDataRequestedFromOverlay == true) {
              // Send the stream data back to the overlay here
              streamStatusToSendToOverlay = {
                time_server_received_twitch_stream_status_request: timeStreamStatusWasRequested.time_server_received_twitch_stream_status_request,
                time_overlay_requested_twitch_stream_status: timeStreamStatusWasRequested.time_overlay_requested_twitch_stream_status,
                overlay_to_server_time_drift_millis: timeStreamStatusWasRequested.overlay_to_server_time_drift_millis,
                server_current_time: new Date().getTime(),
                stream_status_started_at: streamStatusStartedAt,
                stream_status_started_at_millis: streamStatusStartedAtMillis,
                stream_status_viewer_count: streamStatusViewerCount,
                twitch_api_status_code: twitchApiStatusCode,
                time_uptime_was_requested: timeUptimeWasRequested,
                uptime_total: uptimeTotal,
                server_start_time: serverStartTime,
                server_start_time_string: new Date(serverStartTime).toISOString(),
                is_stream_live: true,
                uptime_string: uptimeString2,
                stream_status_delta_uptime: streamStatusDeltaUptime,
                stream_status_uptime_string: streamStatusUptimeString2,
                twitch_channel_status_raw_response: dataArray[0]
              };
              io.to(overlayClientSocketId).emit("stream_status", streamStatusToSendToOverlay);
            }
          }
          if (dataSize <= 0) {
            // Stream is probably offline or the Twitch API fucked up (Or the OAuth Token expired, or failed to connect for whatever reason)
            streamStatusStartedAt = "";
            streamStatusStartedAtMillis = 0;
            streamStatusViewerCount = -1;
            let uptimeDays = (parseInt(uptimeTotal / 86400000)).toString().padStart(2, "0");
            let uptimeHours = (parseInt(uptimeTotal / 3600000) % 24).toString().padStart(2, "0");
            let uptimeMinutes = (parseInt(uptimeTotal / 60000) % 60).toString().padStart(2, "0");
            let uptimeSeconds = (parseInt(uptimeTotal / 1000) % 60).toString().padStart(2, "0");
            let uptimeMillis = (uptimeTotal % 1000).toString().padStart(3, "0");
            let uptimeString = uptimeDays + "day " + uptimeHours + "hour " + uptimeMinutes + "min " + uptimeSeconds + "sec " + uptimeMillis + "msec";
            let uptimeString2 = uptimeDays + "d " + uptimeHours + "h " + uptimeMinutes + "m " + uptimeSeconds + "s " + uptimeMillis + "ms";
            //
            if (isDataRequestedFromOverlay == false) {
              if (client.readyState() === "OPEN") {
                updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                client.reply(channel, "@" + username + " The time is " + new Date(timeUptimeWasRequested).toISOString() + ". The modbot has been up for " + uptimeString + ". The modbot has been up since " + new Date(serverStartTime).toISOString() + ". " + channel + " is currently offline.", msgId);
              }
            }
            if (isDataRequestedFromOverlay == true) {
              // Channel is currently offline, tell overlay stream is offline, tell the overlay there are 0 viewers, and so on
              streamStatusToSendToOverlay = {
                time_server_received_twitch_stream_status_request: timeStreamStatusWasRequested.time_server_received_twitch_stream_status_request,
                time_overlay_requested_twitch_stream_status: timeStreamStatusWasRequested.time_overlay_requested_twitch_stream_status,
                overlay_to_server_time_drift_millis: timeStreamStatusWasRequested.overlay_to_server_time_drift_millis,
                server_current_time: new Date().getTime(),
                stream_status_started_at: streamStatusStartedAt,
                stream_status_started_at_millis: streamStatusStartedAtMillis,
                stream_status_viewer_count: streamStatusViewerCount,
                twitch_api_status_code: twitchApiStatusCode,
                time_uptime_was_requested: timeUptimeWasRequested,
                uptime_total: uptimeTotal,
                server_start_time: serverStartTime,
                server_start_time_string: new Date(serverStartTime).toISOString(),
                is_stream_live: false,
                uptime_string: uptimeString2,
                stream_status_delta_uptime: 0,
                stream_status_uptime_string: "",
                twitch_channel_status_raw_response: {}
              };
              io.to(overlayClientSocketId).emit("stream_status", streamStatusToSendToOverlay);
            }
          }
        }
      }
    });
  });
  req.on("error", function(error) {
    if (isDataRequestedFromOverlay == false) {
      if (client.readyState() === "OPEN") {
        updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
        client.reply(channel, "@" + username + " Error getting stream uptime for " + channel + ".", msgId);
      }
    }
    if (isDataRequestedFromOverlay == true) {
      // uhh idk send data saying stream is offline to the overlay (or maybe not send anything) (yeah I think it's better not to do anything in this and other error cases)
      streamStatusToSendToOverlay = {
        time_server_received_twitch_stream_status_request: timeStreamStatusWasRequested.time_server_received_twitch_stream_status_request,
        time_overlay_requested_twitch_stream_status: timeStreamStatusWasRequested.time_overlay_requested_twitch_stream_status,
        overlay_to_server_time_drift_millis: timeStreamStatusWasRequested.overlay_to_server_time_drift_millis,
        server_current_time: new Date().getTime(),
        stream_status_started_at: streamStatusStartedAt,
        stream_status_started_at_millis: streamStatusStartedAtMillis,
        stream_status_viewer_count: streamStatusViewerCount,
        twitch_api_status_code: twitchApiStatusCode,
        time_uptime_was_requested: timeUptimeWasRequested,
        uptime_total: uptimeTotal,
        server_start_time: serverStartTime,
        server_start_time_string: new Date(serverStartTime).toISOString(),
        is_stream_live: false,
        uptime_string: "",
        stream_status_delta_uptime: 0,
        stream_status_uptime_string: "",
        twitch_channel_status_raw_response: {}
      };
      //io.to(overlayClientSocketId).emit("stream_status", streamStatusToSendToOverlay);
    }
    console.log(new Date().toISOString() + " STREAM UPTIME CONNECTION ERROR");
    console.error(error);
  });
  req.end();
}

setInterval(checkServerUptime, 100);

var currentSecond = new Date().getUTCSeconds();
var currentMinute = new Date().getUTCMinutes();
var currentHour = new Date().getUTCHours();
var currentDate = new Date().getUTCDate();
var currentMonth = new Date().getUTCMonth() + 1;
var currentYear = new Date().getUTCFullYear();
var currentWeekDay = new Date().getUTCDay();

var oldSecond = new Date().getUTCSeconds();
var oldMinute = new Date().getUTCMinutes();
var oldHour = new Date().getUTCHours();
var oldDate = new Date().getUTCDate();
var oldMonth = new Date().getUTCMonth() + 1;
var oldYear = new Date().getUTCFullYear();
var oldWeekDay = new Date().getUTCDay();

var secondToCheck = 40;
var minuteToCheck = 59;
var hourToCheckAm = 11;
var hourToCheckPm = 23;


function checkServerUptime() {
  let currentTimeObject = new Date();
  let currentTimeMillis = currentTimeObject.getTime();
  currentSecond = currentTimeObject.getUTCSeconds();
  currentMinute = currentTimeObject.getUTCMinutes();
  currentHour = currentTimeObject.getUTCHours();
  currentDate = currentTimeObject.getUTCDate();
  currentMonth = currentTimeObject.getUTCMonth() + 1;
  currentYear = currentTimeObject.getUTCFullYear();
  currentWeekDay = currentTimeObject.getUTCDay();

  if (oldSecond != currentSecond) {
    if (oldMinute != currentMinute) {
      if (oldHour != currentHour) {

        if (globalConfig.auto_restart_machine_weekday < 0) {
          console.log(new Date().toISOString() + " The machine restart weekday is invalid (< 0)");
          globalConfig.auto_restart_machine_weekday = 0;
        }
        if (globalConfig.auto_restart_machine_weekday > 6) {
          console.log(new Date().toISOString() + " The machine restart weekday is invalid (> 6)");
          globalConfig.auto_restart_machine_weekday = 6;
        }

        if (globalConfig.auto_restart_machine_hour < 0) {
          console.log(new Date().toISOString() + " The machine restart hour is invalid (< 0)");
          globalConfig.auto_restart_machine_hour = 0;
        }
        if (globalConfig.auto_restart_machine_hour > 23) {
          console.log(new Date().toISOString() + " The machine restart hour is invalid (> 23)");
          globalConfig.auto_restart_machine_hour = 23;
        }

        if (globalConfig.auto_restart_mongod_weekday < 0) {
          console.log(new Date().toISOString() + " The mongod restart weekday is invalid (< 0)");
          globalConfig.auto_restart_mongod_weekday = 0;
        }
        if (globalConfig.auto_restart_mongod_weekday > 6) {
          console.log(new Date().toISOString() + " The mongod restart weekday is invalid (> 6)");
          globalConfig.auto_restart_mongod_weekday = 6;
        }

        if (globalConfig.auto_restart_mongod_hour < 0) {
          console.log(new Date().toISOString() + " The mongod restart hour is invalid (< 0)");
          globalConfig.auto_restart_mongod_hour = 0;
        }
        if (globalConfig.auto_restart_mongod_hour > 23) {
          console.log(new Date().toISOString() + " The mongod restart hour is invalid (> 23)");
          globalConfig.auto_restart_mongod_hour = 23;
        }

        if (globalConfig.enable_auto_restart_mongod == true) {
          //
          if (globalConfig.enable_auto_restart_mongod_daily == true) {
            if (currentHour == globalConfig.auto_restart_mongod_hour) {
              if (currentMinute == 0) {
                if (currentSecond == 0) {
                  console.log(new Date().toISOString() + " Restarting mongod service on modbot on scheduled time (Daily)");
                  if (client.readyState() === "OPEN") {
                    if (chatConfig.send_debug_channel_messages == true) {
                      client.action(chatConfig.debug_channel, new Date().toISOString() + " Restarting mongod service on modbot on scheduled time (Daily)");
                    }
                  }
                  restartMongodService();
                }
              }
              //
            }
            //
          }
          if (globalConfig.enable_auto_restart_mongod_daily == false) {
            //if (oldDate != currentDate)
            {
              //if (oldWeekDay != currentWeekDay)
              {
                if (currentWeekDay == globalConfig.auto_restart_mongod_weekday) {
                  if (currentHour == globalConfig.auto_restart_mongod_hour) {
                    if (currentMinute == 0) {
                      if (currentSecond == 0) {
                        console.log(new Date().toISOString() + " Restarting mongod service on modbot on scheduled time (Weekly)");
                        if (client.readyState() === "OPEN") {
                          if (chatConfig.send_debug_channel_messages == true) {
                            client.action(chatConfig.debug_channel, new Date().toISOString() + " Restarting mongod service on modbot on scheduled time (Weekly)");
                          }
                        }
                        restartMongodService();
                      }
                    }
                    //
                  }
                  //
                }
              }
            }
            //
          }
        }
        if (globalConfig.enable_auto_restart_machine == true) {
          //
          if (globalConfig.enable_auto_restart_machine_daily == true) {
            if (currentHour == globalConfig.auto_restart_machine_hour) {
              if (currentMinute == 0) {
                if (currentSecond == 0) {
                  console.log(new Date().toISOString() + " Restarting machine on modbot on scheduled time (Daily)");
                  if (client.readyState() === "OPEN") {
                    if (chatConfig.send_debug_channel_messages == true) {
                      client.action(chatConfig.debug_channel, new Date().toISOString() + " Restarting machine on modbot on scheduled time (Daily)");
                    }
                  }
                  restartMachine();
                }
              }
              //
            }
            //
          }
          if (globalConfig.enable_auto_restart_machine_daily == false) {
            //if (oldDate != currentDate)
            {
              //if (oldWeekDay != currentWeekDay)
              {
                if (currentWeekDay == globalConfig.auto_restart_machine_weekday) {
                  if (currentHour == globalConfig.auto_restart_machine_hour) {
                    if (currentMinute == 0) {
                      if (currentSecond == 0) {
                        console.log(new Date().toISOString() + " Restarting machine on modbot on scheduled time (Weekly)");
                        if (client.readyState() === "OPEN") {
                          if (chatConfig.send_debug_channel_messages == true) {
                            client.action(chatConfig.debug_channel, new Date().toISOString() + " Restarting machine on modbot on scheduled time (Weekly)");
                          }
                        }
                        restartMachine();
                      }
                    }
                    //
                  }
                  //
                }
              }
            }
            //
          }
        }
      }
    }
    //console.log("Do something");
  }

  oldSecond = currentSecond;
  oldMinute = currentMinute;
  oldHour = currentHour;
  oldDate = currentDate;
  oldMonth = currentMonth;
  oldYear = currentYear;
  oldWeekDay = currentWeekDay;
}

restartMongodService();

function restartMongodService() {
  /*
  if (globalConfig.enable_auto_restart_mongod == false) {
    return;
  }
  */
  chatConnectionStatus = {
    chat_logger_ready_state: chatLogger.readyState(),
    client_ready_state: client.readyState(),
    client_reconnect_attempts: clientReconnectAttempts,
    chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
    server_start_time: serverStartTime,
    server_current_time: new Date().getTime()
  };
  io.sockets.emit("chat_connection_status", chatConnectionStatus);
  let operatingSystem = os.platform();
  console.log(new Date().toISOString() + " Attempting to restart Mongod service, the operating system is: " + operatingSystem);
  if (operatingSystem != "win32" && operatingSystem != "linux") {
    // This should hopefully never happen
    console.log(new Date().toISOString() + " The operating system " + operatingSystem + " is UNKNOWN!");
    console.log(new Date().toISOString() + " Can't restart Mongod" + operatingSystem + ", this operating system is UNKNOWN!");
    return;
  }
  if (operatingSystem == "win32") {
    console.log(new Date().toISOString() + " The operating system " + operatingSystem + " is Windows!");
    console.log(new Date().toISOString() + " Restarting Mongod on " + operatingSystem + " Windows machine!");
    cmd.get(globalConfig.windows_mongod_restart_command, function(err, data, stderr) {
      console.log(data)
    });
  }
  if (operatingSystem == "linux") {
    console.log(new Date().toISOString() + " The operating system " + operatingSystem + " is Linux!");
    console.log(new Date().toISOString() + " Restarting Mongod on " + operatingSystem + " Linux machine!");
    cmd.get(globalConfig.linux_mongod_restart_command, function(err, data, stderr) {
      console.log(data)
    });
  }
}

function sendTwitchWhisper(userIdToSendWhisperTo, whisperToSend, twitchCredentialsObject, twitchAccessTokenObject) {
  if (twitchCredentialsObject.use_twitch_api == false) {
    return;
  }
  //console.log("Attempting to send whisper " + whisperToSend + " to: " + userIdToSendWhisperTo);
  let rawOutputData = "";
  let twitchBotClientId = twitchCredentialsObject.twitch_bot_client_id;
  let twitchBotId = twitchCredentialsObject.twitch_bot_channel_id;
  let twitchBotOauthToken = twitchCredentialsObject.twitch_bot_oauth_access_token;
  let whisperDataToSend = {
    message: whisperToSend
  };
  let options = {
    hostname: "api.twitch.tv",
    path: "/helix/whispers?from_user_id=" + twitchBotId + "&to_user_id=" + userIdToSendWhisperTo,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + twitchBotOauthToken,
      "Client-Id": twitchBotClientId
    }
  };
  //console.log(whisperDataToSend);
  whisperDataToSend = JSON.stringify(whisperDataToSend);
  //console.log(whisperDataToSend);
  //console.log(options);
  let req = https.request(options, function(res) {
    //console.log("WHISPER statusCode: " + res.statusCode);
    res.on("data", function(d) {
      //console.log("WHISPER DATA RECEIVED");
      //console.log(d.toString("utf8"));
      rawOutputData = rawOutputData + d.toString("utf8");
      //console.log(JSON.parse(d.toString("utf8")));
      //process.stdout.write(d);
      //console.log(d);
    });
    res.on("end", function() {
      if (res.statusCode < 200 || res.statusCode > 299) {
        console.log(new Date().toISOString() + " WHISPER RESPONSE ERROR res.statusCode = " + res.statusCode);
        console.log(rawOutputData.toString("utf8"));
      }
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        //console.log("WHISPER END");
        //console.log(JSON.parse(rawOutputData.toString("utf8")));
        //console.log(rawOutputData.toString("utf8"));
        //console.log("I'm not sure if the whisper was sent or not, look above for any error messages!");
        //getTwitchBotTokenStatus(twitchCredentialsObject);
      }
    });
  });
  req.on("error", function(error) {
    console.log(new Date().toISOString() + " WHISPER CONNECTION ERROR");
    console.error(error);
  });
  req.write(whisperDataToSend);
  req.end();
}

function deleteTwitchMessage(broadcasterId, messageIdToDelete, twitchCredentialsObject, twitchAccessTokenObject) {
  if (twitchCredentialsObject.use_twitch_api == false) {
    return;
  }
  //console.log("Attempting to delete a message or clear chat from: " + broadcasterId);
  let rawOutputData = "";
  let twitchBotClientId = twitchCredentialsObject.twitch_bot_client_id;
  let twitchBotId = twitchCredentialsObject.twitch_bot_channel_id;
  let twitchBotOauthToken = twitchCredentialsObject.twitch_bot_oauth_access_token;
  let pathToUse = "/helix/moderation/chat?broadcaster_id=" + broadcasterId + "&moderator_id=" + twitchBotId + "&message_id=" + messageIdToDelete;
  if (messageIdToDelete === "" || messageIdToDelete === undefined || messageIdToDelete === null || messageIdToDelete === [] || messageIdToDelete === "[]" || messageIdToDelete.toLowerCase() === "null" || messageIdToDelete.toLowerCase() === "undefined") {
    //console.log("Attempting to delete all messages from: " + broadcasterId);
    pathToUse = "/helix/moderation/chat?broadcaster_id=" + broadcasterId + "&moderator_id=" + twitchBotId;
  }
  if (messageIdToDelete !== "" && messageIdToDelete !== undefined && messageIdToDelete !== null && messageIdToDelete !== [] && messageIdToDelete !== "[]" && messageIdToDelete.toLowerCase() !== "null" && messageIdToDelete.toLowerCase() !== "undefined") {
    //console.log("Attempting to delete message " + messageIdToDelete + " from: " + broadcasterId);
    pathToUse = "/helix/moderation/chat?broadcaster_id=" + broadcasterId + "&moderator_id=" + twitchBotId + "&message_id=" + messageIdToDelete;
  }
  let options = {
    hostname: "api.twitch.tv",
    path: pathToUse,
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + twitchBotOauthToken,
      "Client-Id": twitchBotClientId
    }
  };
  let req = https.request(options, function(res) {
    //console.log("MESSAGE DELETION statusCode: " + res.statusCode);
    res.on("data", function(d) {
      //console.log("MESSAGE DELETION DATA RECEIVED");
      //console.log(d.toString("utf8"));
      rawOutputData = rawOutputData + d.toString("utf8");
      //console.log(JSON.parse(d.toString("utf8")));
      //process.stdout.write(d);
      //console.log(d);
    });
    res.on("end", function() {
      if (res.statusCode < 200 || res.statusCode > 299) {
        console.log(new Date().toISOString() + " MESSAGE DELETION RESPONSE ERROR res.statusCode = " + res.statusCode);
        console.log(rawOutputData.toString("utf8"));
      }
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        //console.log("MESSAGE DELETION END");
        //console.log(JSON.parse(rawOutputData.toString("utf8")));
        //console.log(rawOutputData.toString("utf8"));
        //console.log("I'm not sure if the message was deleted or not, look above for any error messages!");
        //getTwitchBotTokenStatus(twitchCredentialsObject);
      }
    });
  });
  req.on("error", function(error) {
    console.log(new Date().toISOString() + " MESSAGE DELETION CONNECTION ERROR");
    console.error(error);
  });
  req.end();
}

function banTwitchUser(broadcasterId, userIdToBan, timeoutDuration, banReason, twitchCredentialsObject, twitchAccessTokenObject) {
  if (twitchCredentialsObject.use_twitch_api == false) {
    return;
  }
  //console.log("Attempting to ban or timeout user " + userIdToBan + " from: " + broadcasterId);
  let rawOutputData = "";
  let twitchBotClientId = twitchCredentialsObject.twitch_bot_client_id;
  let twitchBotId = twitchCredentialsObject.twitch_bot_channel_id;
  let twitchBotOauthToken = twitchCredentialsObject.twitch_bot_oauth_access_token;
  let banDataToSend = {
    data: {
      user_id: userIdToBan
    }
  };
  if (banReason !== "" && banReason !== undefined && banReason !== null && banReason !== [] && banReason !== "[]" && banReason.toLowerCase() !== "null" && banReason.toLowerCase() !== "undefined") {
    //console.log("Attempting to ban or timeout user " + userIdToBan + " with reason " + banReason + " from: " + broadcasterId);
    banDataToSend.data.reason = banReason;
  }
  if (timeoutDuration !== "" && timeoutDuration !== undefined && timeoutDuration !== null && timeoutDuration !== [] && timeoutDuration !== "[]" && timeoutDuration !== "null" && timeoutDuration !== "undefined" && timeoutDuration > 0) {
    //console.log("Attempting timeout user " + userIdToBan + " with duration " + timeoutDuration + " from: " + broadcasterId);
    banDataToSend.data.duration = timeoutDuration;
  }
  //console.log(banDataToSend);
  banDataToSend = JSON.stringify(banDataToSend);
  //console.log(banDataToSend);
  let options = {
    hostname: "api.twitch.tv",
    path: "/helix/moderation/bans?broadcaster_id=" + broadcasterId + "&moderator_id=" + twitchBotId,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + twitchBotOauthToken,
      "Client-Id": twitchBotClientId
    }
  };
  let req = https.request(options, function(res) {
    //console.log(options);
    //console.log("USER BAN statusCode: " + res.statusCode);
    res.on("data", function(d) {
      //console.log("USER BAN DATA RECEIVED");
      //console.log(d.toString("utf8"));
      rawOutputData = rawOutputData + d.toString("utf8");
      //console.log(JSON.parse(d.toString("utf8")));
      //process.stdout.write(d);
      //console.log(d);
    });
    res.on("end", function() {
      if (res.statusCode < 200 || res.statusCode > 299) {
        console.log(new Date().toISOString() + " USER BAN RESPONSE ERROR res.statusCode = " + res.statusCode);
        console.log(rawOutputData.toString("utf8"));
      }
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        //console.log("USER BAN END");
        //console.log(JSON.parse(rawOutputData.toString("utf8")));
        //console.log(rawOutputData.toString("utf8"));
        //console.log("I'm not sure if the user was banned/timed out or not, look above for any error messages!");
        //getTwitchBotTokenStatus(twitchCredentialsObject);
      }
    });
  });
  req.on("error", function(error) {
    console.log(new Date().toISOString() + " USER BAN CONNECTION ERROR");
    console.error(error);
  });
  req.write(banDataToSend);
  req.end();
}

function getTwitchBotTokenStatus(twitchAccessTokenObject) {
  if (twitchCredentials.use_twitch_api == false) {
    return;
  }
  console.log(new Date().toISOString() + " Attempting to get twitch bot OAuth Token Status");
  let rawOutputData = "";
  let twitchBotOauthToken = twitchAccessTokenObject.twitch_bot_oauth_access_token;
  if (twitchBotOauthToken === "" || twitchBotOauthToken === undefined || twitchBotOauthToken === null || twitchBotOauthToken === [] || twitchBotOauthToken === "[]" || twitchBotOauthToken.toLowerCase() === "null" || twitchBotOauthToken.toLowerCase() === "undefined") {
    twitchBotOauthToken = twitchAccessTokenObject.access_token;
  }
  let options = {
    hostname: "id.twitch.tv",
    path: "/oauth2/validate",
    method: "GET",
    headers: {
      "Authorization": "Bearer " + twitchBotOauthToken
    }
  };
  let req = https.request(options, function(res) {
    console.log("TWITCH BOT OAUTH TOKEN STATUS statusCode: " + res.statusCode);
    res.on("data", function(d) {
      rawOutputData = rawOutputData + d.toString("utf8");
      //console.log(JSON.parse(d.toString("utf8")));
      //process.stdout.write(d);
      //console.log(d);
    });
    res.on("end", function() {
      if (res.statusCode < 200 || res.statusCode > 299) {
        console.log(new Date().toISOString() + " TWITCH BOT OAUTH TOKEN STATUS RESPONSE ERROR res.statusCode = " + res.statusCode);
        console.log(rawOutputData.toString("utf8"));
      }
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        //console.log(twitchAccessTokenObject);
        console.log(new Date().toISOString() + " TWITCH BOT OAUTH TOKEN STATUS BELOW");
        console.log(JSON.parse(rawOutputData.toString("utf8")));
      }
    });
  });
  req.on("error", function(error) {
    console.log(new Date().toISOString() + " TWITCH BOT OAUTH TOKEN STATUS CONNECTION ERROR");
    console.error(error);
  });
  req.end();
}

function getTwitchTokenStatus(twitchAccessTokenObject) {
  if (twitchCredentials.use_twitch_api == false) {
    return;
  }
  console.log(new Date().toISOString() + " Attempting to get twitch OAuth Token Status");
  let rawOutputData = "";
  let twitchOauthToken = twitchAccessTokenObject.twitch_oauth_access_token;
  if (twitchOauthToken === "" || twitchOauthToken === undefined || twitchOauthToken === null || twitchOauthToken === [] || twitchOauthToken === "[]" || twitchOauthToken.toLowerCase() === "null" || twitchOauthToken.toLowerCase() === "undefined") {
    twitchOauthToken = twitchAccessTokenObject.access_token;
  }
  let options = {
    hostname: "id.twitch.tv",
    path: "/oauth2/validate",
    method: "GET",
    headers: {
      "Authorization": "Bearer " + twitchOauthToken
    }
  };
  let req = https.request(options, function(res) {
    console.log("TWITCH OAUTH TOKEN STATUS statusCode: " + res.statusCode);
    res.on("data", function(d) {
      rawOutputData = rawOutputData + d.toString("utf8");
      //console.log(JSON.parse(d.toString("utf8")));
      //process.stdout.write(d);
      //console.log(d);
    });
    res.on("end", function() {
      if (res.statusCode < 200 || res.statusCode > 299) {
        console.log(new Date().toISOString() + " TWITCH OAUTH TOKEN STATUS RESPONSE ERROR res.statusCode = " + res.statusCode);
        console.log(rawOutputData.toString("utf8"));
      }
      if (res.statusCode >= 200 && res.statusCode <= 299) {
        //console.log(twitchAccessTokenObject);
        console.log(new Date().toISOString() + " TWITCH OAUTH TOKEN STATUS BELOW");
        console.log(JSON.parse(rawOutputData.toString("utf8")));
      }
    });
  });
  req.on("error", function(error) {
    console.log(new Date().toISOString() + " TWITCH OAUTH TOKEN STATUS CONNECTION ERROR");
    console.error(error);
  });
  req.end();
}

if (checkChatConnectionPeriodically == true) {
  setInterval(checkChatConnection, checkChatConnectionPeriodMillis); // I wanted to change the delay to 5000 but I don't know if that's a good idea, it'll probably break stuff (eg: sometimes the same bot reconnects multiple times, still happens even if interval is super high, it must not be my code's fault, but something tmi.js is doing on its own)  
}

function checkChatConnection() {
  chatConnectionStatus = {
    chat_logger_ready_state: chatLogger.readyState(),
    client_ready_state: client.readyState(),
    client_reconnect_attempts: clientReconnectAttempts,
    chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
    server_start_time: serverStartTime,
    server_current_time: new Date().getTime()
  };
  io.sockets.emit("chat_connection_status", chatConnectionStatus);
  if (checkChatConnectionPeriodically == false) {
    return;
  }
  if (sendPingIndependentlyFromCheckChatConnection == false) {
    if (client.readyState() === "OPEN") {
      client.raw("PING");
    }
  }
  if (client.readyState() === "CLOSED") {
    clientReconnectAttempts++;
    console.log(new Date().toISOString() + " [checkChatConnection C CHAT READY STATES] chatLogger.readyState() = " + chatLogger.readyState() + " client.readyState() = " + client.readyState() + " clientReconnectAttempts = " + clientReconnectAttempts + " chatLoggerReconnectAttempts = " + chatLoggerReconnectAttempts);
    chatConnectionStatus = {
      chat_logger_ready_state: chatLogger.readyState(),
      client_ready_state: client.readyState(),
      client_reconnect_attempts: clientReconnectAttempts,
      chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
      server_start_time: serverStartTime,
      server_current_time: new Date().getTime()
    };
    io.sockets.emit("chat_connection_status", chatConnectionStatus);
    client.connect();
    chatConnectionStatus = {
      chat_logger_ready_state: chatLogger.readyState(),
      client_ready_state: client.readyState(),
      client_reconnect_attempts: clientReconnectAttempts,
      chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
      server_start_time: serverStartTime,
      server_current_time: new Date().getTime()
    };
    io.sockets.emit("chat_connection_status", chatConnectionStatus);
  }
  if (sendPingIndependentlyFromCheckChatConnection == false) {
    if (chatLogger.readyState() === "OPEN") {
      chatLogger.raw("PING");
    }
  }
  if (chatLogger.readyState() === "CLOSED") {
    if (chatConfig.log_chat_as_receiver == true) {
      chatLoggerReconnectAttempts++;
      console.log(new Date().toISOString() + " [checkChatConnection D CHAT READY STATES] chatLogger.readyState() = " + chatLogger.readyState() + " client.readyState() = " + client.readyState() + " clientReconnectAttempts = " + clientReconnectAttempts + " chatLoggerReconnectAttempts = " + chatLoggerReconnectAttempts);
      chatConnectionStatus = {
        chat_logger_ready_state: chatLogger.readyState(),
        client_ready_state: client.readyState(),
        client_reconnect_attempts: clientReconnectAttempts,
        chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
        server_start_time: serverStartTime,
        server_current_time: new Date().getTime()
      };
      io.sockets.emit("chat_connection_status", chatConnectionStatus);
      chatLogger.connect();
      chatConnectionStatus = {
        chat_logger_ready_state: chatLogger.readyState(),
        client_ready_state: client.readyState(),
        client_reconnect_attempts: clientReconnectAttempts,
        chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
        server_start_time: serverStartTime,
        server_current_time: new Date().getTime()
      };
      io.sockets.emit("chat_connection_status", chatConnectionStatus);
    }
  }
  chatConnectionStatus = {
    chat_logger_ready_state: chatLogger.readyState(),
    client_ready_state: client.readyState(),
    client_reconnect_attempts: clientReconnectAttempts,
    chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
    server_start_time: serverStartTime,
    server_current_time: new Date().getTime()
  };
  io.sockets.emit("chat_connection_status", chatConnectionStatus);
}

if (sendPingIndependentlyFromCheckChatConnection == true) {
  if (sendPingPeriodically == true) {
    setInterval(sendPing, sendPingPeriodMillis); // I wanted to change the delay to 5000 but I don't know if that's a good idea, it'll probably break stuff (eg: sometimes the same bot reconnects multiple times, still happens even if interval is super high, it must not be my code's fault, but something tmi.js is doing on its own)
  }
}

function sendPing() {
  chatConnectionStatus = {
    chat_logger_ready_state: chatLogger.readyState(),
    client_ready_state: client.readyState(),
    client_reconnect_attempts: clientReconnectAttempts,
    chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
    server_start_time: serverStartTime,
    server_current_time: new Date().getTime()
  };
  io.sockets.emit("chat_connection_status", chatConnectionStatus);
  if (sendPingIndependentlyFromCheckChatConnection == false) {
    return;
  }
  if (sendPingPeriodically == false) {
    return;
  }
  if (client.readyState() === "OPEN") {
    client.raw("PING");
  }
  if (chatLogger.readyState() === "OPEN") {
    chatLogger.raw("PING");
  }
  chatConnectionStatus = {
    chat_logger_ready_state: chatLogger.readyState(),
    client_ready_state: client.readyState(),
    client_reconnect_attempts: clientReconnectAttempts,
    chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
    server_start_time: serverStartTime,
    server_current_time: new Date().getTime()
  };
  io.sockets.emit("chat_connection_status", chatConnectionStatus);
}

function restartMachine() {
  chatConnectionStatus = {
    chat_logger_ready_state: chatLogger.readyState(),
    client_ready_state: client.readyState(),
    client_reconnect_attempts: clientReconnectAttempts,
    chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
    server_start_time: serverStartTime,
    server_current_time: new Date().getTime()
  };
  io.sockets.emit("chat_connection_status", chatConnectionStatus);
  let operatingSystem = os.platform();
  console.log(new Date().toISOString() + " Attempting to restart machine, the operating system is: " + operatingSystem);
  if (operatingSystem != "win32" && operatingSystem != "linux") {
    // This should hopefully never happen
    console.log(new Date().toISOString() + " The operating system " + operatingSystem + " is UNKNOWN!");
    console.log(new Date().toISOString() + " Can't restart " + operatingSystem + " machine, this operating system is UNKNOWN!");
    return;
  }
  if (operatingSystem == "win32") {
    console.log(new Date().toISOString() + " The operating system " + operatingSystem + " is Windows!");
    console.log(new Date().toISOString() + " Restarting " + operatingSystem + " Windows machine!");
    cmd.get(globalConfig.windows_restart_command, function(err, data, stderr) {
      console.log(data)
    });
  }
  if (operatingSystem == "linux") {
    console.log(new Date().toISOString() + " The operating system " + operatingSystem + " is Linux!");
    console.log(new Date().toISOString() + " Restarting " + operatingSystem + " Linux machine!");
    cmd.get(globalConfig.linux_restart_command, function(err, data, stderr) {
      console.log(data)
    });
  }
}

async function restartChatConnection() {
  console.log(new Date().toISOString() + " Someone pressed R on the keyboard (or pressed the RESTART CONNECTION button) on the status_page to restart the chat connection, Restarting main bot connection!");
  chatConnectionStatus = {
    chat_logger_ready_state: chatLogger.readyState(),
    client_ready_state: client.readyState(),
    client_reconnect_attempts: clientReconnectAttempts,
    chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
    server_start_time: serverStartTime,
    server_current_time: new Date().getTime()
  };
  io.sockets.emit("chat_connection_status", chatConnectionStatus);
  if (client.readyState() !== "CLOSED") {
    console.log(new Date().toISOString() + " [checkChatConnection G CHAT READY STATES] chatLogger.readyState() = " + chatLogger.readyState() + " client.readyState() = " + client.readyState() + " clientReconnectAttempts = " + clientReconnectAttempts + " chatLoggerReconnectAttempts = " + chatLoggerReconnectAttempts);
    console.log(new Date().toISOString() + " Someone pressed R on the keyboard (or pressed the RESTART CONNECTION button) on the status_page to restart the chat connection, Restarting main bot connection!");
    chatConnectionStatus = {
      chat_logger_ready_state: chatLogger.readyState(),
      client_ready_state: client.readyState(),
      client_reconnect_attempts: clientReconnectAttempts,
      chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
      server_start_time: serverStartTime,
      server_current_time: new Date().getTime()
    };
    io.sockets.emit("chat_connection_status", chatConnectionStatus);
    client.disconnect();
    chatConnectionStatus = {
      chat_logger_ready_state: chatLogger.readyState(),
      client_ready_state: client.readyState(),
      client_reconnect_attempts: clientReconnectAttempts,
      chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
      server_start_time: serverStartTime,
      server_current_time: new Date().getTime()
    };
    io.sockets.emit("chat_connection_status", chatConnectionStatus);
    await sleep(500);
    client.connect();
    chatConnectionStatus = {
      chat_logger_ready_state: chatLogger.readyState(),
      client_ready_state: client.readyState(),
      client_reconnect_attempts: clientReconnectAttempts,
      chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
      server_start_time: serverStartTime,
      server_current_time: new Date().getTime()
    };
    io.sockets.emit("chat_connection_status", chatConnectionStatus);
  }
  if (chatLogger.readyState() !== "CLOSED") {
    if (chatConfig.log_chat_as_receiver == true) {
      console.log(new Date().toISOString() + " [checkChatConnection H CHAT READY STATES] chatLogger.readyState() = " + chatLogger.readyState() + " client.readyState() = " + client.readyState() + " clientReconnectAttempts = " + clientReconnectAttempts + " chatLoggerReconnectAttempts = " + chatLoggerReconnectAttempts);
      console.log(new Date().toISOString() + " Someone pressed R on the keyboard (or pressed the RESTART CONNECTION button) on the status_page to restart the chat connection, Restarting chat logger connection!");
      chatConnectionStatus = {
        chat_logger_ready_state: chatLogger.readyState(),
        client_ready_state: client.readyState(),
        client_reconnect_attempts: clientReconnectAttempts,
        chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
        server_start_time: serverStartTime,
        server_current_time: new Date().getTime()
      };
      io.sockets.emit("chat_connection_status", chatConnectionStatus);
      chatLogger.disconnect();
      chatConnectionStatus = {
        chat_logger_ready_state: chatLogger.readyState(),
        client_ready_state: client.readyState(),
        client_reconnect_attempts: clientReconnectAttempts,
        chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
        server_start_time: serverStartTime,
        server_current_time: new Date().getTime()
      };
      io.sockets.emit("chat_connection_status", chatConnectionStatus);
      await sleep(500);
      chatLogger.connect();
      chatConnectionStatus = {
        chat_logger_ready_state: chatLogger.readyState(),
        client_ready_state: client.readyState(),
        client_reconnect_attempts: clientReconnectAttempts,
        chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
        server_start_time: serverStartTime,
        server_current_time: new Date().getTime()
      };
      io.sockets.emit("chat_connection_status", chatConnectionStatus);
    }
  }
}

// Called every time a message comes in
async function onMessageHandler(target, tags, message, self) {
  let internalMessageTimestamp = new Date().getTime();
  let internalMessageTimestampIsoString = new Date(internalMessageTimestamp).toISOString();
  //console.log(tags);
  if (self == true) {
    return;
  } // Ignore messages from the bot
  //console.log(message);
  //console.log(target);
  //console.log("TAGS");
  //console.log(tags);
  let originalMessage = message;
  message = message.replace(/[\󠀀\ㅤ\ᅟ]+/ig, "");
  let customRewardId = tags["custom-reward-id"];
  let messageType = tags["message-type"];
  let displayName = tags["display-name"];
  let username = tags["username"];
  let userColor = tags["color"];
  let userColorInverted = "#000000";
  let isFirstTwitchMessage = tags["first-msg"];
  let isReturningChatter = tags["returning-chatter"];
  let twitchUserColor = userColor;
  let messageId = tags["id"];
  let twitchMessageTimestamp = tags["tmi-sent-ts"];
  let twitchMessageTimestampIsoString = "";
  let originalMessageWords = originalMessage.split(/\s+/ig);
  let isExecutingSavedMacro = false;
  let savedMacroNameToExecute = "";
  let savedMacroContentsToExecute = "";
  let savedMacroTimesWasUsed = 0;
  channelToSendMessageTo = target;
  //console.log(messageType);
  //console.log(JSON.stringify(tags));
  if (isNaN(parseInt(twitchMessageTimestamp, 10)) == false) {
    twitchMessageTimestamp = parseInt(twitchMessageTimestamp, 10);
    twitchMessageTimestampIsoString = new Date(parseInt(twitchMessageTimestamp, 10)).toISOString();
  }
  if (isNaN(parseInt(twitchMessageTimestamp, 10)) == true) {
    twitchMessageTimestamp = internalMessageTimestamp;
    twitchMessageTimestampIsoString = internalMessageTimestampIsoString;
  }
  //console.log("internalMessageTimestamp = " + internalMessageTimestamp);
  //console.log("internalMessageTimestampIsoString = " + internalMessageTimestampIsoString);
  //console.log("twitchMessageTimestamp = " + twitchMessageTimestamp);
  //console.log("twitchMessageTimestampIsoString = " + twitchMessageTimestampIsoString);
  //console.log("messageId = " + messageId);
  let userId = tags["user-id"];
  let roomId = tags["room-id"];
  //console.log("roomId=" + roomId);
  //console.log("userId=" + userId);
  username = username.replace(/(\\s)+/ig, "");
  username = username.replace(/\s+/ig, "");
  displayName = displayName.replace(/(\\s)+/ig, "");
  displayName = displayName.replace(/\s+/ig, "");
  let usernameToPing = (username.toLowerCase() == displayName.toLowerCase()) ? displayName : username;
  usernameToSendMessageTo = usernameToPing;
  messageIdToReplyTo = messageId;
  roomIdToSendMessageTo = roomId;
  let randomColorIndex = Math.floor(Math.random() * defaultColors.length);
  let randomColor = defaultColors[randomColorIndex];
  //console.log("randomColor = " + randomColor);
  if (userColor == null || userColor == undefined || userColor == "") {
    //var randomColor = Math.floor(Math.random() * defaultColors.length);
    //console.log("Color " + defaultColors[randomColor] + " " + defaultColorNames[randomColor])
    //userColor = defaultColors[randomColor];
    //userColor = "#DEDEDE"; // Default twitch color when an user doesn't have color set (only appears on vod playback, not live chat)
    userColor = "#000000";
    /*
    usersWhoDontHaveColor.push({
      user_color: userColor,
      user_id: userId
    });
    */
  }
  /*
  console.log(target);
  console.log(tags);
  console.log(message);
  console.log(self);
  */
  //var inputContainsDashes = false;
  //var inputContainsDashesAtTheEnd = false;
  /*
  console.log(userId);
  console.log(messageId);
  console.log(userColor);
  console.log(customRewardId);
  console.log(messageType);
  console.log(displayName);
  console.log(username);
  console.log(message);
  */
  //console.log("messageId");
  //console.log(messageId);
  if (messageType == "whisper") {
    // Resend whisper to channel owner here
    updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
    if (chatConfig.resend_whisper_to_channel_owner == true) {
      sendTwitchWhisper(chatConfig.channel_owner_id, new Date().toISOString() + " [WHISPER] " + userId + " " + usernameToPing + ": " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
    }
    if (chatConfig.resend_whisper_to_debug_channel == true) {
      client.action(chatConfig.debug_channel, new Date().toISOString() + " [WHISPER] " + userId + " " + usernameToPing + ": " + originalMessage);
    }
  }
  if (messageType == "chat" || messageType == "action") {
    //let checkBigFollowsSpamBot = /(w+a+n+a+)+\s+(b+e+c+o+m+e)+\s+(f+a+m+o+u+s+\W*)+\s+(b+u+y+)+\s+(f+[o0]+l+[o0]+w+\w*)+\W*\s*(p*r*i*m*e*s*)*\s+(a+n+d+)+\s+(v+i+e+w+\w*)+\s+(\w*)+\s*/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, ""));

    //let checkTwitchViewBotSoftwareBot = /(t+w+\w*t+c+h+)+\s+(v+i+e+w+\w*\s*b+[o0]+t+\w*)+\s+(s+o+f+t+w+a+r+e+\w*\W*)+\s*(d+o+)+\s+(a+n+y+)+\s*(o+n+l+i+n+e+)*\s+(\w*)+\s+(a+n+y+)+\s+(s+t+r+e+a+m+\w*\W*\w*)+\s+(\W*\d*\W*)+\W*\s*((d+i+s+c+o+r+d+)+\s+\W*\s+(\w+\W*\d+))*/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, ""));

    /*
    let bannerSpamBotTypeA = [/((i+t+)+\s*(i+s+)|(i+t+\W*s+))+\s+(n+i+c+e+)+\s+(t+o+)+\s+(m+e+t+)+\s+(y+\w*)+\s+(\w+\W*v+e+)+\s+(w+a+t+c+h+e+d+)+\s+(y+\w*)+\s+([^\n\s]*)+\s+(t+w+\w*t+c+h+)\s+(c+h+a+n+e+l+\w*\W*)+/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      /(y+\w*)+\s+(s+i+r+\W*)+\s+(h+a+v+e+)+\s+(f+l+o+w+\W*)+\s+(i+t+\W*s+)+\s+(a+w+e+s+\w+m+e\W*)+\s+(\w+)+\s+(l+i+k+e+)+\s+(y+\w*)+\s+(s+t+r+e+a+m+\w*\W*\w*)+/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      /(g+o+d+\W*)+\s+((\w+\W*\s*a+m+)|(\w+\W*\s*m+))+\s+(\w*b+o+u+t+)+\s+(t+o+)+\s+(d+o+)+\s+(g+r+a+p+h+i+c+)+\s+(d+e+s+i+g+n+)+\s+(f+o+r+)+\s+(y+\w*)+\s+(s+t+r+e+a+m+\w*\W*\w*)+/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      /(h+a+v+e+)+\s+(\w+)+\s+(l+o+k+)+\s+((a*t*|i*n*|o*n*)*\s*(t+h+e+)+)+\s+(r+e+f+e+r+e+n+c+e)+\s+(\w*)+\s+(m+y+)+\s+(p+r+o+f+i+l+e\W*\w*)+\s+(b+a+n+e+r+)+/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, ""))
    ];
    */
    //console.log(bannerSpamBotTypeA);
    /*
    let bannerSpamBotTypeB = [/(h+e+y+)+\s+(t+h+e+r+e+\W*)+\s+(w+h+a+t+\W*s+\s*n+e+w+)+\s+(\w+)+\s+(c+h+e+c+k+e+d+)+\s+(o+u+t+)+\s+(y+\w*)+\s+([^\n\s]*)+\s+(c+h+a+n+e+l+\w*)+\s+(h+e+r+e+)+\s+(\w+)+\s+(t+w+\w*t+c+h+\W*)+/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig)),
      /^(\w*b+o+u+t+)+/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig)),
      /(k+e+e+p+)+\s+(u+p+)+\s+(t+h+e+)+\s+(g+o+d+)+\s+(s+t+r+e+a+m\w*\W*\w*)+\s+(m+a+n+)+\s+((\w+\W*\s*a+m+)|(\w+\W*\s*m+))+\s+(g+o+i+n+g+)+\s+(t+o+)+\s+(d+o+)+\s+(a+n+i+m+a+t+e+d+)+\s+(b+r+b+\W*)+\s+(i+n+t+r+o\W*)+\s+(a+n+d+)+\s+(o+f+l+i+n+e+)+\s+(s+c+r+e+n+)+\s+(f+o+r+)+\s+(y+\w*)+\s+(c+h+a+n+e+l+\w*\W*)+/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig)),
      /(t+a+k+e+)+\s+(\w+)+\s+(l+o+k+)+\s+((a*t*|i*n*|o*n*)*\s*(t+h+e+)+)+\s+(u+r+l+)+\s+(\w*)+\s+(m+y+)+\s+(a+c+o+u+n+t+\W*\w*)+\s+(i+m+a+g+e+)+\s+(p+r+o+b+a+b+l+y+)+\s+(t+h+e+)+\s+(b+e+s+t+\W*)+/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig))
    ];
    */
    //console.log(bannerSpamBotTypeB);
    //console.log("checkBigFollowsSpamBot = " + checkBigFollowsSpamBot);
    //console.log("checkTwitchViewBotSoftwareBot = " + checkTwitchViewBotSoftwareBot);

    //let checkDiscordStreamersCommunityBot = /(h+e+y+\W*)+\s+(n+i+c+e+)+\s+(s+t+r+e+a+m+\w*\W*\w*\W*)+\s+(y+\w*)+\s+(s+h+\w*)+\s+(f+o+r+)+\s+(s+u+r+e+)+\s+(j+o+i+n+)+\s+(\w*)+\s+(s+t+r+e+a+m\w*\W*\w*)+\s+(c+o+m+u+n+i+t+y+)+\s+(\w*)+\s+(j+u+s+t+)+\s+(f+o+u+n+d+)+\s+(\w*)+\s+(d+i+s+c+o+r+d+)+\s+(y+e+s+t+e+r+d+a+y+)+\s+([^\n\s]*)+\s+(c+h+e+c+k+)+\s+(i+t+)+\s+(o+u+t+)+/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig));
    //console.log("checkDiscordStreamersCommunityBot = " + checkDiscordStreamersCommunityBot);

    //let singleMessageSpamBots = [/(w+a+n+a+)+\s+(b+e+c+o+m+e)+\s+(f+a+m+o+u+s+\W*)+\s+(b+u+y+)+\s+(f+[o0]+l+[o0]+w+\w*)+\W*\s*(p*r*i*m*e*s*)*\s+(a+n+d+)+\s+(v+i+e+w+\w*)+\s+(\w*)+\s*/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
    //  /(t+w+\w*t+c+h+)+\s+(v+i+e+w+\w*\s*b+[o0]+t+\w*)+\s+(s+o+f+t+w+a+r+e+\w*\W*)+\s*(d+o+)+\s+(a+n+y+)+\s*(o+n+l+i+n+e+)*\s+(\w*)+\s+(a+n+y+)+\s+(s+t+r+e+a+m+\w*\W*\w*)+\s+(\W*\d*\W*)+\W*\s*((d+i+s+c+o+r+d+)+\s+\W*\s+(\w+\W*\d+))*/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
    //  /(h+e+y+\W*)+\s+(n+i+c+e+)+\s+(s+t+r+e+a+m+\w*\W*\w*\W*)+\s+(y+\w*)+\s+(s+h+\w*)+\s+(f+o+r+)+\s+(s+u+r+e+)+\s+(j+o+i+n+)+\s+(\w*)+\s+(s+t+r+e+a+m\w*\W*\w*)+\s+(c+o+m+u+n+i+t+y+)+\s+(\w*)+\s+(j+u+s+t+)+\s+(f+o+u+n+d+)+\s+(\w*)+\s+(d+i+s+c+o+r+d+)+\s+(y+e+s+t+e+r+d+a+y+)+\s+([^\n\s]*)+\s+(c+h+e+c+k+)+\s+(i+t+)+\s+(o+u+t+)+/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig)),
    //  /(d+o+)+\s+(y+o+\w*)+\s+((w+a+n+t+)|(w+a+n+a+))+\s+(p+o+p+u+l+a+r+\w*[^\n\s]*)+\s+(b+u+y+)+\s+(f+[o0]+l+[o0]+w+\w*)+\s+(a+n+d+)+\s+(v+i+e+w+\w*)+\s+(\w+)+\s+([^\n\s]+)+/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig)),
    //  /([^\n\s]+)+\s+([^\n\s]+)+\s+(a+f+i+l+i+a+t+e+)+\s+(f+o+\w*)+\s+(f+r+e+)+\s+([^\n\s]+)+/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig)), // Message processing somethings hangs on this regex
    //  /([^\n\s]+)+\s+(s+u+\w+e+r+\w*)+\s+(p+r+i+m+e+\w*)+\s+(s+u+b+\w*)+\s+([^\n\s]+)+/ig.test(message.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig))
    //];
    let replaceCyrillicsWithLatin = message;
    replaceCyrillicsWithLatin = replaceCyrillicsWithLatin.replace(/[！-～]/g, shiftCharCode(-0xFEE0)); // Convert fullwidth to halfwidth
    replaceCyrillicsWithLatin = replaceCyrillicsWithLatin.normalize("NFD");
    replaceCyrillicsWithLatin = replaceCyrillicsWithLatin.replace(/[！-～]/g, shiftCharCode(-0xFEE0)); // Convert fullwidth to halfwidth

    for (let cyrillicsReplacementTableIndex = 0; cyrillicsReplacementTableIndex < cyrillicsReplacementTable.length; cyrillicsReplacementTableIndex++) {
      replaceCyrillicsWithLatin = replaceCyrillicsWithLatin.replace(cyrillicsReplacementTable[cyrillicsReplacementTableIndex].symbolOriginalString, cyrillicsReplacementTable[cyrillicsReplacementTableIndex].symbolReplacementString);
      //console.log(cyrillicsReplacementTableIndex);
      //console.log(cyrillicsReplacementTable[cyrillicsReplacementTableIndex]);
      //console.log(cyrillicsReplacementTable[cyrillicsReplacementTableIndex].symbolOriginalString);
      //console.log(cyrillicsReplacementTable[cyrillicsReplacementTableIndex].symbolReplacementString);
    }
    //console.log("replaceCyrillicsWithLatin");
    //console.log(replaceCyrillicsWithLatin);
    replaceCyrillicsWithLatin = replaceCyrillicsWithLatin.replace(/[！-～]/g, shiftCharCode(-0xFEE0)); // Convert fullwidth to halfwidth
    let singleMessageSpamBots = [
      //console.log("Test 0"),
      ///(((f+[o0]+l+[o0]+w+\w*)+|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)+|(v+i+e+w+\w*)+)+\W*\s*((f+[o0]+l+[o0]+w+\w*)*|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)*|(v+i+e+w+\w*)*)*\W*\s*(a*n*d*)*\s*((f+[o0]+l+[o0]+w+\w*)+|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)+|(v+i+e+w+\w*)+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // the combination of the words "view(ers)", "follow(ers)" and "view(ers)" in any order
      //console.log("Test 1"),
      /(t+w+\w*t+c+h+)+\s+(((f+[o0]+l+[o0]+w+\w*)|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)|(v+i+e+w+\w*))\s*b+[o0]+t+\w*)+\s+(s+o+f+t+w+a+r+e+\w*\W*)+\s*(d+o+)+\s+(a+n+y+)+\s*(o+n+l+i+n+e+)*\s+(\w*)\s+(a+n+y+)+\s+(s+t+r+e+a+m+[^\s]*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 2"),
      /(h+e+y+[^\s]*)+\s+(n+i+c+e+)+\s+(s+t+r+e+a+m+[^\s]*)+\s+(y+\w*)+\s+(s+h+\w*)+\s+(f+o+\w*)+\s+(s+u+r+e+)+\s+(j+o+i+n+)+\s+(\w*)\s+(s+t+r+e+a+m+[^\s]*)+\s+(c+o+m+u+n+i+t+y+)+\s+(\w*)\s+(j+u+s+t+)+\s+(f+o+u+n+d+)+\s+(\w*)\s+(d+i+s+c+o+r+d+)+\s+(y+e+s+t+e+r+d+a+y+)+\s+([^\s]*)\s+(c+h*e+[ck]+)+\s+(i+t+)+\s+(o+u+t+)+\s*([^\s]*)/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 3"),
      /(d+o+)+\s+(y+o+\w*)+\s+(w+a+n+\w+)+\s*(t*o*)*\s*(b*e*c*o*m*e*)*\s+(p+o+p+u+l+a+r+\w*[^\s]*|f+a+m+o+u+s+\W*[^\s]*)+\s+((b+u+y+)+|(b+e+s+t+)+|(g+e+t+)+)+\s+((f+[o0]+l+[o0]+w+\w*)|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)|(v+i+e+w+\w*))+\s+(a+n+d+)+\s+((f+[o0]+l+[o0]+w+\w*)|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)|(v+i+e+w+\w*))+\s+(\w+)/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 4"),
      /(a+f+i+l+i+a+t+e+)+\s+(f+o+\w*)+\s+(f+r+e+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 5"),
      /(s+u+\w+e+r+\w*)+\s+((f+[o0]+l+[o0]+w+\w*)|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)|(v+i+e+w+\w*))+\s+(s+u+b+\w*)+\s*([^\s]*)/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 6"),
      /(h+e+l+o+[^\s]*)+\s+(i+f+)+\s+(y+o+\w*)+\s+(n+e+d+)+\s+(r+e+a+l+)\s+(f+r+e+)+\s+(a+n+d+)+\s+(h+i+[gq]+h+)+\s+(q+u+a+l+i+t+y+)+\s+(s+e+r+v+i+c+e+s*)+\s+(t+\w*)+\s+(i+n+c+r+e+a+s+e+)+\s+(y+o+\w*)+\s+((f+[o0]+l+[o0]+w+\w*)|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)|(v+i+e+w+\w*))+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 7"),
      /((c+u+t+)+|(b+i+t+)+|(u+)+|(s+h+o*r+t+u*r+l+)+)+\s*(\.+|d+o+t+)*\s*((l+y+)+|(t+v+)+|(c+o+m*)+|(p+l+u+s*)+|(t+o+)+|(a+t+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 8"),
      /(b+i+g+)+\s*(\.+|d+o+t+)*\s*((f+[o0]+l+[o0]+w+\w*)|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)|(v+i+e+w+\w*))+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 9"),
      /(c+h+i+l+p+|b+i+g+\s*((f+[o0]+l+[o0]+w+\w*)|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)|(v+i+e+w+\w*))+)+\s*(\.+|d+o+t+)*\s*(c+o+m*|i+t+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 10"),
      /(h+e+l+o+[^\s]*)+\s+(i+)+\s+(d+o+)+\s+(g+r+a+p+h+i+c+)+\s+(d+e+s+i+g+n+)+\s+(\w+o+)+\s+(i+f+)+\s+(y+o+\w*)+\s+(n+e+d+)+\s+(w+o+r+k+)+\s+(d+o+n+e+)+\s+((l+i+k+e+)+|(l+[ou]+v+e*)+)+\s+(\w+)+\s+(l+o+g+o+[^\s]*)+\s+(b+a+n+e+r+[^\s]*)+\s+(p+a+n+e+l+[^\s]*)+\s+(o+v+e+r+l+a+y+[^\s]*)+\s+(e+t+c+[^\s]*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 11"),
      /((c+o+d+e+)+\s*(f+o+\w*)*\s*(\w+)+\s+((f+[o0]+l+[o0]+w+\w*)+|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)+|(v+i+e+w+\w*)+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 12"),
      /((p+r+o+m+o+t*i*o*n*a*l*)+\s*(c+o+d+e+)+\s*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 13"),
      /((g+[\s\-\_]*e+[\s\-\_]*t+)+[\s\-\_]*(v+[\s\-\_]*i+[\s\-\_]*e+[\s\-\_]*w+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 14"),
      /((g+[\s\-\_]*\-+[\s\-\_]*t+)+[\s\-\_]*(v+[\s\-\_]*\-+[\s\-\_]*e+[\s\-\_]*w+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 15"),
      /((t+w+[l1\!\|]+t+c+h+s*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 16"),
      /((t+w+[li1\!\|]+t+c+h+s*)+)+\s*(\.+|d+o+t+)+\s*((l+y+)+|(t+v+)+|(c+o+m*)+|(p+l+u+s*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Check if first message is twitch.tv. tbh, if an user posts a twitch.tv link as first message, then uh that's a bruh moment tbh, I think it's safe to say they're just here to spam(?)
      //console.log("Test 17"),
      /((t+w+[li1\!\|]+t+c+h+s*)+)+\s*((l+a+u+n+c+h+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // TwitchLaunch
      //console.log("Test 18"),
      /((t+w+[li1\!\|]+t+c+h+s*)+)+\s*(((s+t+r+m+)+|(s+t+r+e+a+m+)+|(s+t+r+a+e+m+)+|(s+t+r+e+m+)+|(s+t+r+a+m+)+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Twitch Streams
      //console.log("Test 19"),
      /((t+i+c*k+\s*t+o+c*k+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // TikTok
      //console.log("Test 20"),
      ///((((c+o+n+t+e+n+t+)+)+\s+((p+o+s+t+(i*n*g*)*)+)+)+|(((r+o+c+k+e+t+)+)+\s+((a+u+d+i+e+n+c+e+)+)+)+|(((\d+)+)+\s+((d+o+l+l+a+r+)*\s*)*((p+e+r+)+|(f+o+\w*)+|(\/)+)(\s*\d+)*\s+((d+a+y+)+|(d+a+i+l+y+)+)+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), //Content Posting, Rocket Audience, number per day, number/day, number for number daily, drive engagement
      //console.log("Test 21"),
      /((t+w+[li1\!\|]+t+c+h+s*\s*\-+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 22"),
      ///(((f+[o0]+l+[o0]+w+\w*)+|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)+|(v+i+e+w+\w*)+|(c+h+a+t+\s*b+[o0]+t+\w*)+)+\W*\s*((f+[o0]+l+[o0]+w+\w*)+|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)+|(v+i+e+w+\w*)+|(c+h+a+t+\s*b+[o0]+t+\w*)+)+\W*\s*((f+[o0]+l+[o0]+w+\w*)+|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)+|(v+i+e+w+\w*)+|(c+h+a+t+\s*b+[o0]+t+\w*)+)+\W*\s*((f+[o0]+l+[o0]+w+\w*)+|((s*u*b*\s*\-*\s*)*p+r+i+m+e+\w*(\s*\-*\s*s*u*b*)*\w*(\s*\-*\s*s*u*b*)*)+|(v+i+e+w+\w*)+|(c+h+a+t+\s*b+[o0]+t+\w*)+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // the combination of the words "view(ers)", "follow(ers)", "view(ers)" and "chat bot(s)" in any order
      //console.log("Test 23"),
      /((d+o+g+e+)+\s*(h+y+p+e+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // dogehype (site to buy followers, viewers, etc)
      //console.log("Test 24"),
      /((s+t+r+e*a*m+i*n*g*e*r*s*)+\s*(r+i+s+e+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // streamrise dot ru (another site to buy followers, viewers, etc)
      //console.log("Test 25"),
      /((s+t+r+e*a*m+i*n*g*e*r*s*)+\s*(b+o+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // streamboo dot com (another site to buy followers, viewers, etc)
      //console.log("Test 26"),
      /((d+o*g+e*)+[\s\-\_]*(h+y+p+e+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // dogehype (site to buy followers, viewers, etc)
      //console.log("Test 27"),
      /((s+t+r+e*a*m+i*n*g*e*r*s*)+[\s\-\_]*(r+i+s+e+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // streamrise dot ru (another site to buy followers, viewers, etc)
      //console.log("Test 28"),
      /((s+t+r+e*a*m+i*n*g*e*r*s*)+[\s\-\_]*(b+o+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // streamboo dot com (another site to buy followers, viewers, etc)
      //console.log("Test 29"),
      /((s+t+r+e*a*m+i*n*g*e*r*s*)+\s*(p+r+o+m+o+t*i*o*n*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // stream-promotion dot ru (another site to buy followers, viewers, etc)
      //console.log("Test 30"),
      /((s+t+r+e*a*m+i*n*g*e*r*s*)+[\s\-\_]*(p+r+o+m+o+t*i*o*n*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // stream-promotion dot ru (another site to buy followers, viewers, etc)
      //console.log("Test 31"),
      /((p+r+o+m+o+t*e*)+\s+(y+o+\w*)+\s+((c+h+a+n+e+l+s*)+|(s+t+r+e*a*m+i*n*g*e*r*s*)+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Come stream-promotion ru. Promote your channel, viewers, followers, views, chat bots. Many offers for different platforms. Autostart. Responsive support 24\7
      //console.log("Test 32"),
      /((o+f+e+r+s*)+\s*(\s*\w+)\s*(d+i+f+e+r+e+n+t*)+\s+(p+l+a+t+a*f+o+r+m+a*s*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Come stream-promotion ru. Promote your channel, viewers, followers, views, chat bots. Many offers for different platforms. Autostart. Responsive support 24\7
      //console.log("Test 33"),
      /(q+u+a+l+i*t*y*)+\s+(i+s+)+\s+([wg]+u*a+r+a+n*t+[ey]+[dt]*)+\s+(t+o+)+\s+(b+e+)+\s+(t+h+e+)+\s+(b+e+[sr]+t+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Quality is guaranteed to be the best
      //console.log("Test 34"),
      /(q+u+a+l+i*t*y*)+\s*(i+s+)*\s+([wg]+u*a+r+a+n*t+[ey]+[dt]*)+\s*(t+o+)*\s*(b+e+)*\s*(t+h+e+)*\s+(b+e+[sr]+t+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Quality (is) guaranteed ((to) (be) (the)) best
      //console.log("Test 35"),
      /(q+u+a+l+i*t*y*)+\s+([wg]+u*a+r+a+n*t+[ey]+[dt]*)+\s+(b+e+[sr]+t+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Quality guaranteed best
      //console.log("Test 36"),
      /(e+v+e+r+y+\s*t+h+i+n+g+)+\s+(i+s+)+\s+([aeiou]+n+)+\s+(y+o+\w*)+\s+(h+a+n+d+s*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Everything is in your hands
      //console.log("Test 37"),
      /(t+u+r+n+)+\s*(i+t+)*\s+(o+n+|o+f+|c+u+[sz]+t+o+m+i*[sz]*e*)+\s*\/*\s*(o+n+|o+f+|c+u+[sz]+t+o+m+i*[sz]*e*)+\s*\/*\s*(o+n+|o+f+|c+u+[sz]+t+o+m+i*[sz]*e*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // turn it on/off/customize
      //console.log("Test 38"),
      /(f+l+e+x+i*b*l*e*)+\s*(a+n+d+)*\s+(c+o+n*v+e+n*i+e+n*t*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Flexible and convenient
      //console.log("Test 39"),
      /(o+r+d+e+r+)+\s+(m+a+n+a+g+e*m*e*n*t*)+\s+(p+a+n+e+l+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Order management panel
      //console.log("Test 40"),
      /(a+n+y+)+\s+(c+o+m+p+e*t+i+t+o+r+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Any competitor
      //console.log("Test 41"),
      /((h+e+l+o+)+|(h+i+)+|(h+o+w+d+y+)+)+\s*\,*\s+(s+o+r+y+)+\s+(f+o+\w*)+\s+(b+o+t+h+e+r*i*n*g*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Hello, sorry for bothering
      //console.log("Test 42"),
      /(s+o+r+y+)+\s+(f+o+\w*)+\s+(b+o+t+h+e+r*i*n*g*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // sorry for bothering
      //console.log("Test 43"),
      /((o+n+l+y+)+\s*(f+a+n+s*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 44"),
      /((t+i+n+y+)+\s*(u+r+l+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 45"),
      /((t+i+n+y+)+[\s\-\_]*(u+r+l+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 46"),
      /(((o+f+e+r+)+|(c+a+t+c+h+)+)+\s*\w*\s*p+r+o+m+o+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Offer promo(tion), catch promo(tion)
      //console.log("Test 47"),
      /(((f+r+e+)+\s+(v+i+e+w+\w*)+)+|((v+i+e+w+\w*)+\s*\w*\s*(f+r+e+)+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 48"),
      /((r+u+s+t+)+[\s\-\_]*(e+v+e+n+t+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 49"),
      /((r+u+s+t+)+[\s\-\_]*(d+r+o+p+s*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 50"),
      /((d+r+o+p+s*)+[\s\-\_]*(v+[\s\-\_]*b+u+c+k+s*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // https:///drops-vbucks.com
      //console.log("Test 51"),
      /((t+w+[li1\!\|]+t+c+h+)+\s*(d+r+o+p+s*)+\s*\w*\s*(r+u+s+t+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 52"),
      /((m+a+j+o+r+)+[\s\-\_]*(t+w+[li1\!\|]+t+c+h+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 53"),
      /((r+u+s+t)+[\s\-\_]*(t+w+[li1\!\|]+t+c+h+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 54"),
      /(f+a+c+e+p+u+n+c+h+[\s\-\_]*l+i+v+e+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 55"),
      /(((l+i+v+e)*|(c+u+t+)*|(b+i+t+)*)*\s*(\.+|d+o+t+)+\s*((l+y+)+|(t+v+)+|(c+o+m*)+|(p+l+u+s*)+)+\/+(t+w+[li1\!\|]+t+c+h+s*\s*\-*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 56"),
      /(c+s+\W*g+o+[\s\-\_]*d+a+l+a+s)+\s*(\.+|d+o+t+)+\s*((l+y+)+|(t+v+)+|(c+o+m*)+|(p+l+u+s*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 57"),
      /(e+s+l+[\s\-\_]*d+r+o+p+s*)+\s*(\.+|d+o+t+)+\s*((l+y+)+|(t+v+)+|(c+o+m*)+|(p+l+u+s*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 58"),
      ///((r+u+s+t+)+|(g+i+f+t+)+|(c+o+d+e+)+|(e+v+e+n+t+)+|(a+w+a+r+d+)+|(c+o+n+e+c+t+)+|(c+s+\W*g+o+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Comment this line if bot bans accidentally
      //console.log("Test 59"),
      /(p+r+i+c+e+\s+i+s+\s+l+o+w+e+r+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Price is lower
      //console.log("Test 60"),
      /(l+o+w+e+r+\s+p+r+i+c+e+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 61"),
      /(r+e+a+l+y+)+\s+(e+n+j+o+y+)+\s+(y+o+\w*)+\s+((c+o+n+t+e+n+t+)+|(s+t+r+e*a*m+i*n*g*e*r*s*s*)+)+\s+(a+n+d+)+\s+(f+i+n+d+)+(\s+i+t+)*\s+(e+n+j+o+y+a+b+l+e+)\s+(t+o+)+\s+(w+a+t+c+h+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // greetings. I really enjoy your content and find it enjoyable to watch. I recommend that you continue your outstanding work. SeemsGood SeemsGood (PART 1)
      //console.log("Test 62"),
      /(r+e+c+o+m+e+n+d+)+\s+(t+h+a+t+)+\s+(y+o+\w*)+\s+(c+o+n+t+i+n+u+e+)+\s+(y+o+\w*)+\s+((o+u+t+s+t+a+n+d+i+n+g+)+|(a+m+a+z+i+n+g+)+)+\s+(w+o+r+k+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // greetings. I really enjoy your content and find it enjoyable to watch. I recommend that you continue your outstanding work. SeemsGood SeemsGood (PART 2)
      //console.log("Test 63"),
      /((h+e+y)+|(h+e+l+o+)+|(h+i+)+|(h+o+w+d+y+)+)+\,*\s+((n+i+c+e+)+|(m+a+t+e+)+|(b+u+d+y*)+|(f+r+i*e+n+d*)+)+\,*\s*\,*((m+e+t+i+n+g+)+|(s+t+r+e*a*m+i*n*g*e*r*s*)+)+\s+(y+o+\w*)+\s*\,*(\s*a+n+d+)*\s*(h+o+w+)+\s+(i+s+)+\s+(y+o+\w*)\s+(s+t+r+e*a*m+i*n*g*e*r*s*)+\s+(g+o+i+n+g*)+(\s*\w+)*\s+(s+o+)+\s+(f+a+r+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // hello nice meeting you and how is your streaming going on so far
      //console.log("Test 64"),
      /((h+e+y)+|(h+e+l+o+)+|(h+i+)+|(h+o+w+d+y+)+)+\,*\s+((n+i+c+e+)+|(m+a+t+e+)+|(b+u+d+y*)+|(f+r+i*e+n+d*)+)+\,*\s*\,*(n+i+c+e+)*\s+((m+e+t+i+n+g+)+|(s+t+r+e*a*m+i*n*g*e*r*s*)+)+\s*(\w*)\s*(n+o+t+i+c+e+d*)+\s+(((s+o+m+e+)+|(s+m+o+e+)+)\s*(t+h+i+n+[kg]*)+)+\s*(\s*\w+)\s*(y+o+\w*)+\s+((s+t+r+m+)+|(s+t+r+e+a+m+)+|(s+t+r+a+e+m+)+|(s+t+r+e+m+)+|(s+t+r+a+m+)+|(c+h+a+n+e+l+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Hi mate nice streaming I noticed something on your channel that I think needs to be amended. I’d love to chat with you more about it on Discord. It would be a great opportunity to discuss the issue in more detail and to come up with a solution together. Would you be willing to chat with me on Discord? My username is Diablous#8216 (PART 1)
      //console.log("Test 65"),
      /((\w+[\'\’]+d+)+\s+)*(l+[ou]+v+e*)+(\s+t+o+)*\s+((c+h+a+t)+|(a+d+)+|(t+a+l+k+)+)+\s+(w+i+t+h*)+\s+(y+o+\w*)+(\s*m+o+r+e+)*\s+(a*b+o+u+t*)+(\s+i+t+)*(\s*\w+)\s+(d+i+s+c+o+r+d+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Hi mate nice streaming I noticed something on your channel that I think needs to be amended. I’d love to chat with you more about it on Discord. It would be a great opportunity to discuss the issue in more detail and to come up with a solution together. Would you be willing to chat with me on Discord? My username is Diablous#8216 (PART 2)
      //console.log("Test 66"),
      /(i+t+)*(\s*((w+o+u+l+d+)+|([\'\’]d)+)+)\s+(b+e+)+\s*([aeiou]+)*\s*(g+r+e+a+t+)\s+(o+p+o+r+t+u+n+i+t+y*)+(\s+t+o+)*\s+(d+i+s+c+u+s+)+\s+(t+h+e)+\s+(i+s+u+e+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Hi mate nice streaming I noticed something on your channel that I think needs to be amended. I’d love to chat with you more about it on Discord. It would be a great opportunity to discuss the issue in more detail and to come up with a solution together. Would you be willing to chat with me on Discord? My username is Diablous#8216 (PART 3)
      //console.log("Test 67"),
      /(c+[ou]+m+e*)+\s+(u+p+)+\s+(w+i+t+h*)\s*(\w*)\s*(s+o+l+u+t+i+o+n+s*)+\s*(t+o+g+e+t+h+e+r+)*/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Hi mate nice streaming I noticed something on your channel that I think needs to be amended. I’d love to chat with you more about it on Discord. It would be a great opportunity to discuss the issue in more detail and to come up with a solution together. Would you be willing to chat with me on Discord? My username is Diablous#8216 (PART 4)
      //console.log("Test 68"),
      /(((w+o+u+l+d+)+|([\'\’]d)+)+)+\s+(y+o+\w*)+(\s+(b+e+)+)*\s+(w+i+l+i*n*g*)+(\s+t+o+)*\s+((c+h+a+t)+|(a+d+)+|(t+a+l+k+)+)+\s+(w+i+t+h*)+\s+(m+e+)+(\s*(\s*\w+)\s*(d+i+s+c+o+r+d+)+)*/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Hi mate nice streaming I noticed something on your channel that I think needs to be amended. I’d love to chat with you more about it on Discord. It would be a great opportunity to discuss the issue in more detail and to come up with a solution together. Would you be willing to chat with me on Discord? My username is Diablous#8216 (PART 5)
      //console.log("Test 69"),
      /((h+e+y)+|(h+e+l+o+)+|(h+i+)+|(h+o+w+d+y+)+)+\,*\s+((n+i+c+e+)+|(m+a+t+e+)+|(b+u+d+y*)+|(f+r+i*e+n+d*)+)+\,*\s*\,*(y+o+\w*)*\s+((m+e+t+i+n+g+)+|(s+t+r+e*a*m+i*n*g*e*r*s*)+)+\s+(p+r+e+t+y+)+\s+(c+o+l+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Howdy mate, You stream pretty cool that’s why I followed you. I will like to make you a friend and be a fan, if you don’t mind Kindly chat me on Discord, my Discord username is markk_2 (PART 1)
      //console.log("Test 70"),
      /((h+e+y)+|(h+e+l+o+)+|(h+i+)+|(h+o+w+d+y+)+)+\,*\s+((n+i+c+e+)+|(m+a+t+e+)+|(b+u+d+y*)+|(f+r+i*e+n+d*)+)+\,*\s*\,*(y+o+\w*)*\s+((m+e+t+i+n+g+)+|(s+t+r+e*a*m+i*n*g*e*r*s*)+)+\s+(p+r+e+t+y+)+\s+(c+o+l+)+\,*\s+\,*(t+h+a+t+[\'\’]*\s*[IiSs]*)+\s+(w+h+y+)+\s*(\w*)*\s*(f+o+l+o+w+\w*)+\s*(y+o+\w*)*/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Howdy mate, You stream pretty cool that’s why I followed you. I will like to make you a friend and be a fan, if you don’t mind Kindly chat me on Discord, my Discord username is markk_2 (PART 2)
      //console.log("Test 71"),
      ///(\w*)*\s*(w+i+l+)+\s*((l+i+k+e+)+|(l+[ou]+v+e*)+)+\s+(t+o+)+\s+((m+a+k+e*)+|(b+e+c*o*m*e*)+)+\s*(y+o+\w*)*\s*(\w*)*\s+(f+r+i*e+n+d*)+(\s+(a+n+d+)+\s+((m+a+k+e*)+|(b+e+c*o*m*e*)+)+\s*(\w*)*\s+(f+a+n+s*)+)*/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Howdy mate, You stream pretty cool that’s why I followed you. I will like to make you a friend and be a fan, if you don’t mind Kindly chat me on Discord, my Discord username is markk_2 (PART 3)
      //console.log("Test 72"),
      /(i+f+)+\s*(y+o+\w*)*\s+(d+o+n+[\'\’]*t+)+\s+(m+i+n+d+)+\s*\,*\s*(k+i+n+d+l+y+)*\s+((c+h+a+t)+|(a+d+)+|(t+a+l+k+)+)+\s*(m+e+)*\s+(o+n+)+\s+(d+i+s+c+o+r+d+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Howdy mate, You stream pretty cool that’s why I followed you. I will like to make you a friend and be a fan, if you don’t mind Kindly chat me on Discord, my Discord username is markk_2 (PART 4)
      //console.log("Test 73"),
      /((h+e+y)+|(h+e+l+o+)+|(h+i+)+|(h+o+w+d+y+)+)+\,*\s+((n+i+c+e+)+|(m+a+t+e+)+|(b+u+d+y*)+|(f+r+i*e+n+d*)+)+\,*\s*\,*(\w*)\s*(r+e+a+l+y+)+\s+(e+n+j+o+y+)+\s+(y+o+\w*)+\s+((c+o+n+t+e+n+t+)+|(s+t+r+e*a*m+i*n*g*e*r*s*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Hey, mate, I really enjoy your streams,you stream pretty cool and I love it . I'd love to be part of your fan community. Could you add me on Discord? My username 👉👉👉ayofe_1 (PART 1)
      //console.log("Test 74"),
      /((h+e+y)+|(h+e+l+o+)+|(h+i+)+|(h+o+w+d+y+)+)+\,*\s+((n+i+c+e+)+|(m+a+t+e+)+|(b+u+d+y*)+|(f+r+i*e+n+d*)+)+\,*\s*\,*((\w*)\s*(r+e+a+l+y+)+\s+(e+n+j+o+y+)+\s+(y+o+\w*)+\s+((c+o+n+t+e+n+t+)+|(s+t+r+e*a*m+i*n*g*e*r*s*)+)+\s*\,*\s*)*(y+o+\w*)*\s+((m+e+t+i+n+g+)+|(s+t+r+e*a*m+i*n*g*e*r*s*)+)+\s+(p+r+e+t+y+)+\s+(c+o+l+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Hey, mate, I really enjoy your streams,you stream pretty cool and I love it . I'd love to be part of your fan community. Could you add me on Discord? My username 👉👉👉ayofe_1 (PART 2)
      //console.log("Test 75"),
      /((h+e+y)+|(h+e+l+o+)+|(h+i+)+|(h+o+w+d+y+)+)+\,*\s+((n+i+c+e+)+|(m+a+t+e+)+|(b+u+d+y*)+|(f+r+i*e+n+d*)+)+\,*\s*\,*((\w*)\s*(r+e+a+l+y+)+\s+(e+n+j+o+y+)+\s+(y+o+\w*)+\s+((c+o+n+t+e+n+t+)+|(s+t+r+e*a*m+i*n*g*e*r*s*)+)+\s*\,*\s*)*(y+o+\w*)*\s+((m+e+t+i+n+g+)+|(s+t+r+e*a*m+i*n*g*e*r*s*)+)+\s+(p+r+e+t+y+)+\s+(c+o+l+)+\s*(a+n+d+)+\s*(\w*)\s*((l+i+k+e+)+|(l+[ou]+v+e*)+)+\s*(i+t+)*/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Hey, mate, I really enjoy your streams,you stream pretty cool and I love it . I'd love to be part of your fan community. Could you add me on Discord? My username 👉👉👉ayofe_1 (PART 3)
      //console.log("Test 76"),
      ///(\w*)*\s*[\'\’]*\s*(\w*)*\s*((l+i+k+e+)+|(l+[ou]+v+e*)+)+\s+(t+o+)+\s+((m+a+k+e*)+|(b+e+c*o*m*e*)+)+\s+\w*\s*((p+a+r+t+)+|(m+e+m+b+e+r+)+)+\s*(\w*)\s*(y+o+\w*)*\s*(f+a+n+s*)\s*(c+o+m+u+n+i+t+y+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Hey, mate, I really enjoy your streams,you stream pretty cool and I love it . I'd love to be part of your fan community. Could you add me on Discord? My username 👉👉👉ayofe_1 (PART 4)
      //console.log("Test 77"),
      ///(c+o+u+l+d+)*\s*(y+o+\w*)*\s*((c+h+a+t)+|(a+d+)+|(t+a+l+k+)+)+\s*(m+e+)*\s+(o+n+)+\s+(d+i+s+c+o+r+d+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Hey, mate, I really enjoy your streams,you stream pretty cool and I love it . I'd love to be part of your fan community. Could you add me on Discord? My username 👉👉👉ayofe_1 (PART 5)
      //console.log("Test 78"),
      /(m+y+)+\s*(d+i+s+c+o+r+d+)*\s*(u+s+e+r+)+\s*(n+a+m+e+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Hey, mate, I really enjoy your streams,you stream pretty cool and I love it . I'd love to be part of your fan community. Could you add me on Discord? My username 👉👉👉ayofe_1 (PART 6) (Do Not Use, Could cause false positives)
      //console.log("Test 79"),
      /((m+y+\s*s+t+r+m+)+|(m+y+\s*s+t+r+e+a+m+)+|(m+y+\s*s+t+r+a+e+m+)+|(m+y+\s*s+t+r+e+m+)+|(m+y+\s*s+t+r+a+m+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 80"),
      /((\.+|d+o+t+)+\s*(s+t+o+r+e+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 81"),
      /((((v+i+e+w+\w*)+|(f+[o0]+l+[o0]+w+\w*)+|(s+u+b+\w*)+)+((a+n+d+)*|(\,+)*)*\s*((v+i+e+w+\w*)+|(f+[o0]+l+[o0]+w+\w*)+|(s+u+b+\w*)+)+\s*((a+n+d+)*|(\,+)*)*\s*((v+i+e+w+\w*)+|(f+[o0]+l+[o0]+w+\w*)+|(s+u+b+\w*)+)+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // the combination of the words "view(ers)", "follow(ers)" and "view(ers)" in any order (but slightly different)
      //console.log("Test 82"),
      /((t+)+\s*(\.+|d+o+t+)+\s*(c+o+m*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // t.co links? bruh if you post that of course you are getting banned, you can never tell what a t.co link is
      //console.log("Test 83"),
      /((v+a+l+[\s\-\_]*k+[\s\-\_]*[\w\,]*[\s\-\_]*b+e+a+c+[ht]+)+\s*(\.+|d+o+t+)*\s*(c+o+m*)*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // valkonbeact.com code: 9cp03 (idk what this link is, it's probably another csgo scam or something)
      //console.log("Test 84"),
      /((a+l+)+\s*(f+o+\w*)+\s*(y+\w*)\s*((s+t+r+m+)+|(s+t+r+e+a+m+)+|(s+t+r+a+e+m+)+|(s+t+r+e+m+)+|(s+t+r+a+m+)+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 85"),
      /(((u+p+(\s*g*r*a*d*e*)*)+|(u+p+(\s*d*a*t*e*)*)+)+\s*(y+\w*)\s*((s+t+r+m+)+|(s+t+r+e+a+m+)+|(s+t+r+a+e+m+)+|(s+t+r+e+m+)+|(s+t+r+a+m+)+|(c+h+a+n+e+l+)+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      //console.log("Test 86"),
      /(p+r+o+m+o+((t*i*n*g*)*|(t*e*)*)*)\s+(t+w+[li1\!\|]+t+c+h+s*)+\s+(c+h+a+n+e+l+s*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // <3 The   best service in promoting Twitch channels -  STREAMSKILL. pro\en ! Get a Free test of 20 viewers for 1 hour only with us! <3 (PART 1)
      //console.log("Test 87"),
      /(b+e+s+t)+\s+(s+e+r+v+i+c+e+s*)*\s*(\w+)\s+(p+r+o+m+o+((t*i*n*g*)*|(t*e*)*)*)\s+(t+w+[li1\!\|]+t+c+h+s*)+\s+(c+h+a+n+e+l+s*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // <3 The   best service in promoting Twitch channels -  STREAMSKILL. pro\en ! Get a Free test of 20 viewers for 1 hour only with us! <3 (PART 1 alternate)
      //console.log("Test 88"),
      /((g+e+t+)+\s*(\w+)*\s+(f+r+e+)+\s+)*(t+e+s+t+)+\s*(\w+)*\s+(\d+)+\s+(v+i+e+w+\w*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // <3 The   best service in promoting Twitch channels -  STREAMSKILL. pro\en ! Get a Free test of 20 viewers for 1 hour only with us! <3 (PART 2)
      //console.log("Test 89"),
      /(f+r+e+)*\s*(t+e+s+t+)+\s*(\w+)*\s+(\d+)+\s+(v+i+e+w+\w*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // <3 The   best service in promoting Twitch channels -  STREAMSKILL. pro\en ! Get a Free test of 20 viewers for 1 hour only with us! <3 (PART 2 alternate)
      //console.log("Test 90"),
      /(s+t+r+e*a*m+i*n*g*e*r*s*)+\s*(s+k+i+l+)+\s*([\.\,\\\/]|d+o+t+)*\s*(p+r+o+)+\s*([\.\,\\\/])*\s*(e+n+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // <3 The   best service in promoting Twitch channels -  STREAMSKILL. pro\en ! Get a Free test of 20 viewers for 1 hour only with us! <3 (PART 3)
      //console.log("Test 91"),
      /(s+t+r+e*a*m+i*n*g*e*r*s*)+\s*(s+k+i+l+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // <3 The   best service in promoting Twitch channels -  STREAMSKILL. pro\en ! Get a Free test of 20 viewers for 1 hour only with us! <3 (PART 4)
      //console.log("Test 92"),
      ///(\d*)*\s*(h+o+u+r)+((\s+(o+n+l+y+)+)*\s+(w+i+t+h*)+\s+(u+s+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // <3 The   best service in promoting Twitch channels -  STREAMSKILL. pro\en ! Get a Free test of 20 viewers for 1 hour only with us! <3 (PART 5)
      //console.log("Test 93"),
      /(h+i+)*\s*(((I+)+\s+(a+m+)+)+|((I+'+m+)+)+)+\s+(a)+\s+(s+m+[aeiouy]+l+)+\s+(s+t+r+e*a*m+i*n*g*e*r*s*)+(\s+(b+y+)+\s+(t+h+e+)+)*\s+(n+a+m+e*d*)+\s+([\w\-\_]+)+\s+(g+i+v+e+)+(\s+(m+e+)+)*\s+(a+)+\s+(f+o+l+o+w+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Hi I am a small streamer by the name XsaveXgoodX give me a follow I'm live rn I'm 19 and playing black ops 3 it would be much appreciated (Is this even a spam bot? I'm not sure)
      //console.log("Test 94"),
      /(((c+h*e+[ck]+)+)+(\s+((m+y+)+)+)*\s+((l+i+v+e+)+)+\s+((g+i+v+e+\s*a*w+a+y+)+)+\s+((t+w+[li1\!\|]+t+c+h+s*)+)+\s*((f+o+l+o+w+\w*)+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Ceck my live giveaway twitch followers
      //console.log("Test 95"),
      /((b+e+s+t+)+|(b+u+y+)+|(c+h+e+a+p)+)+\s+((v+i+e+w+\w*)+|(f+o+l+o+w+\w*)+)+\s*([\w\,]*)*\s*((v+i+e+w+\w*)+|(f+o+l+o+w+\w*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Best Viewers and Followers on StreamBoo .com (  u.to/yp_QIA )
      //console.log("Test 96"),
      /((b+e+s+t+)+|(b+u+y+)+|(c+h+e+a+p)+)+\s+((v+i+e+w+\w*)+|(f+o+l+o+w+\w*)+)+\s*([\w\,]*)*/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // [Wed 2024-05-29T15:16:56Z]  <rickyboi999838893> Best viewers on cutt.ly/Pey3i71C
      //console.log("Test 97"),
      /((h+i+[gq]+h+)+\s+(q+u+a+l+i+t+y+)\s*([\w\,]*)*\s*)*((b+e+s+t+)+|(b+u+y+)+|(c+h+e+a+p)+)+\s+((v+i+e+w+\w*)+|(f+o+l+o+w+\w*)+)+\s*([\w\,]*)*\s*((v+i+e+w+\w*)+|(f+o+l+o+w+\w*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // [Mon 2024-06-10T19:14:03Z]  <fafixfan> Hiqh quality and Cheap Viewers on  u.to/vRi7IA
      //console.log("Test 98"),
      /((h+i+[gq]+h+)+\s+(q+u+a+l+i+t+y+)\s*([\w\,]*)*\s*)*((b+e+s+t+)+|(b+u+y+)+|(c+h+e+a+p)+)+\s+((v+i+e+w+\w*)+|(f+o+l+o+w+\w*)+)+\s*([\w\,]*)*/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // [Mon 2024-06-10T19:14:03Z]  <fafixfan> Hiqh quality and Cheap Viewers on  u.to/vRi7IA
      //console.log("Test 99"),
      /((r*e*m+o+v+e+)+|(n+o+)+)+\s*(\w*)\s*(s*p+a+c+e+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Remove the space / No Space
      //console.log("Test 100"),
      /(l+e+t+[\'\’]*\s*[UuSs]*)+\s*(c+o+n+e+c+t+)+\s*(\w*)\s*(d+i+s+c+o+r+d+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // [Sat 2024-11-09T15:38:46Z]  <wumight4> Hey streamer 👋,I’ve been really enjoying your content, which is why I’m part of your squad. I noticed you’re facing some challenges with growing your channel and leveling up. I’d love to share ideas and help elevate your stream. Let’s connect on Discord: Femight7. (Let's connect on Discord)
      //console.log("Test 101"),
      /(l+e+t+[\'\’]*\s*[UuSs]*)+\s*(c+o+n+e+c+t+)+\s*(\w*)\s*(d+i+s+c+o+r+d+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")) // [Sat 2024-11-09T15:38:46Z]  <wumight4> Hey streamer 👋,I’ve been really enjoying your content, which is why I’m part of your squad. I noticed you’re facing some challenges with growing your channel and leveling up. I’d love to share ideas and help elevate your stream. Let’s connect on Discord: Femight7. (growing your channel)
      //console.log("Test 102")
    ];
    let multiMessageSpamBotTypeA = [
      /((i+t+)+\s*(i+s+)|(i+t+\W*s+))+\s+(n+i+c+e+)+\s+(t+o+)+\s+(m+e+t+)+\s+(y+\w*)+\s+(\w+\W*v+e+)+\s+(w+a+t+c+h+e+d+)+\s+(y+\w*)+\s+([^\s]*)+\s+(t+w+\w*t+c+h+)\s+(c+h+a+n+e+l+\w*\W*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      /(y+\w*)+\s+(s+i+r+\W*)+\s+(h+a+v+e+)+\s+(f+l+o+w+\W*)+\s+(i+t+\W*s+)+\s+(a+w+e+s+\w+m+e\W*)+\s+(\w+)+\s+(l+i+k+e+)+\s+(y+\w*)+\s+(s+t+r+e+a+m+\w*\W*\w*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      /(g+o+d+\W*)+\s+((\w+\W*\s*a+m+)|(\w+\W*\s*m+))+\s+(\w*b+o+u+t+)+\s+(t+o+)+\s+(d+o+)+\s+(g+r+a+p+h+i+c+)+\s+(d+e+s+i+g+n+)+\s+(f+o+r+)+\s+(y+\w*)+\s+(s+t+r+e+a+m+\w*\W*\w*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      /(h+a+v+e+)+\s+(\w+)+\s+(l+o+k+)+\s+((a*t*|i*n*|o*n*)*\s*(t+h+e+)+)+\s+(r+e+f+e+r+e+n+c+e)+\s+(\w*)+\s+(m+y+)+\s+(p+r+o+f+i+l+e\W*\w*)+\s+(b+a+n+e+r+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, ""))
    ];
    let multiMessageSpamBotTypeB = [
      /(h+e+y+)+\s+(t+h+e+r+e+\W*)+\s+(((w+h+a+t+)+|(h+w+a+t+)+)+\W*i*s+\s*n+e+w+)+\s+(\w+)+\s+(c+h*e+[ck]+e+d+)+\s+(o+u+t+)+\s+(y+\w*)+\s+([^\s]*)+\s+(c+h+a+n+e+l+\w*)+\s+(h+e+r+e+)+\s+(\w+)+\s+(t+w+\w*t+c+h+\W*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      /^(a*b+o+u+t+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      /(k+e+p+)+(\s*(i+t+)*\s*)*(u+p+)+\s+(t+h+e+)+\s+(g+o+d+)+\s+(s+t+r+e+a+m\w*\W*\w*)+\s+(m+a+n+)+\s+((\w+\W*\s*a+m+)|(\w+\W*\s*m+))+\s+(g+o+i+n+g*)+\s+(t+o+)+\s+(d+o+)+\s+(a+n+i+m+a+t+e+d+)+\s+(b+r+b+\W*)+\s+(i+n+t+r+o\W*)+\s+(a+n+d+)+\s+(o+f+l+i+n+e+)+\s+(s+c+r+e+n+)+\s+(f+o+r+)+\s+(y+\w*)+\s+(c+h+a+n+e+l+\w*\W*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      /(t+a+k+e+)+\s+(\w+)+\s+(l+o+k+)+\s+((a*t*|i*n*|o*n*)*\s*(t+h+e+)+)+\s+(u+r+l+)+\s+(\w*)+\s+(m+y+)+\s+(a+c+o+u+n+t+\W*\w*)+\s+(i+m+a+g+e+)+\s+(p+r+o+b+a+b+l+y+)+\s+(t+h+e+)+\s+(((b+u+y+)|(b+e+s+t+)|(g+e+t+))+\W*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, ""))
    ];
    let multiMessageSpamBotTypeC = [
      /((h+e+y+)+\s+((w+h+a+t+)+|(h+w+a+t+)+)+\W*i*s+\s*((u+p+)+|(n+e+w+)+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      /(((h[oi]w)+|(hw[oi])+)+\W*i*s+\s*(y+o+\w*)+\s*(d+a+y+)+\s*(g+o+i+n+g*)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      /((i+t+)+\W*((i*s+)|(h+a+s+))+\s*(b+e+n+)+\s*(p+r+e+t+y+)+\s*(g+o+d+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      /(((a+r+t+)+\s*(w+o+r+k+)+)+\s*(f+o+r+)+\s*(s+t+r+e+a+m+\w*\W*\w*)+\s*(\w*)*\s*(g+o+d+)+\s*(p+r+i+c+e+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")),
      /((g+i+v+e*)+\s*(m+e+)*\s*(\w*)*\s+(d+i+s+c+o+r+d+)+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, ""))
    ];
    let multiMessageSpamBotTypeD = [
      /(h+e+l+[aeiou]+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // helloi
      /((h+o+w+)+|(h+w+o+)+)+\s*([aeiou]*r+[aeiou]*)*\s+(y+o+\w*)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // How are you ?
      /(c+a+n+)+\s*(\w*)\s*(m+a+k+e+)+\s+(a+r+t+s*)+\s+(f+o+r*)+\s+(y+o+\w*)+\s+(c+h+a+n+e+l+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // can I make arts for your channel
      /(s+e+n+[dt]+)+\s+(m+e+)+\s+(y+o+\w*)+\s+(d+i+s+c+o+r+d+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // Send me your discord
      /(d+i+s+c+o+r+d+)+\s+(s+e+n+[dt]+)+\s+(m+e+)+\s+(y+o+\w*)+\s+(r+e+q+u+e+s+t+)+\s+(s+o+)+\s*(\w*)\s*(c+a+n+)+\s+(s+h+a+r+e+)+\s+(m+y+)+\s+(w+o+r+k+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // alisadaniel its ,my discord sent me your request so i can share my work <3
      /(t+y+p+e*)+\s+(y+o+\w*)+\s+(d+i+s+c+o+r+d+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")) // type your discord ?
    ];
    let multiMessageSpamBotTypeE = [
      /(h+e+l+[aeiou]+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // hello 👋👋👋👋👋👋👋👋👋👋👋
      /(h+a+v+e+)+\s*(\w*)*\s*(n+i+c+e+)+\s+(c+h+a+n+e+l+)+(\s*\,*\s*)*(k+e+p+)+(\s*(i+t+)*\s*)*(u+p+)+/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")), // you have a nice channel keep it up 👍👍👍👍👍👍👍👍👍👍
      /(h+a+v+e+)+\s*(\w*)*\s*(i+m+p+o+r+t+a+n+t+)+\s+(t+a+l+k+)+\s+(\w*b+o+u+t+)+\s+(y+o+\w*)+\s+(c+h+a+n+e+l+)+\s*(\w*)\s*(c+o+n+t+a+c+t+)+\s+(m+e+)(\s*(\s*\w+)\s*(d+i+s+c+o+r+d+)+)*/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")) // I have an important talk about your channel kindly contact me on discord. Pearl0307
    ];
    let slurDetection = false; // User will be instantly permabanned, no matter how known the user is, more words will be added as they happen
    if (globalConfig.enable_slur_detection == true) {
      //console.log("Slur Detection is enabled, run the regex");
      slurDetection = /(\b(((n+\s*[IiOo01]+(\s*[Gg6]+)+\s*[Ee3]+\s*[r]+)+)+)\b|\b(((n+\s*[IiOo01]+(\s*[Gg6]+)+\s*[Aa4\@]+)+)+)\b|\b(((t+\s*r+\s*[Aa4\@]+(\s*i+)*(\s*n+)+\s*y+)+)+)\b|\b(((t+\s*r+\s*[Aa4\@]+(\s*i+)*(\s*n+)+\s*o+\s*i+(\s*n+)*\s*d+)+)+)\b|\b(((f+\s*[Aa4\@]+(\s*[Gg6]+)+(\s*[Oo0]+\s*[Tt]+)*)+)+)\b|\b(((r+\s*[Ee3]+\s*t+\s*[Aa4\@]+\s*r+\s*d+)+)+)+\b)/ig.test(replaceCyrillicsWithLatin.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "")); // User will be instantly permabanned, no matter how known the user is, more words will be added as they happen
    }
    if (globalConfig.enable_slur_detection == false) {
      //console.log("Slur Detection is not enabled, ignore all messages");
      slurDetection = false;
    }
    let messageToCountLetters = replaceCyrillicsWithLatin;
    let doesMessageHaveTooManyUpperCaseLetters = false;
    messageToCountLetters = messageToCountLetters.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "");
    let removeUpperCaseLetters = messageToCountLetters;
    removeUpperCaseLetters = removeUpperCaseLetters.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "");
    removeUpperCaseLetters = removeUpperCaseLetters.normalize("NFD").replace(/[A-Z]+/g, "");
    let removeLowerCaseLetters = messageToCountLetters;
    removeLowerCaseLetters = removeLowerCaseLetters.normalize("NFD").replace(/[\u007E-\uFFFF]+/ig, "");
    removeLowerCaseLetters = removeLowerCaseLetters.normalize("NFD").replace(/[a-z]+/g, "");
    let upperCaseLettersCount = removeLowerCaseLetters.length;
    let lowerCaseLettersCount = removeUpperCaseLetters.length;
    let originalMessageLetterCount = messageToCountLetters.length;
    let upperCaseLettersRatio = 0;
    let lowerCaseLettersRatio = 0;
    let upperCaseLettersToLowerCaseLettersRatio = 0;
    let upperCaseLettersRatioNeededToTriggerTimeout = globalConfig.all_caps_message_ratio; // Timeout if 90% or more of characters are upper case
    let upperCaseMessageLength = globalConfig.all_caps_message_length;
    /*
    console.log("messageToCountLetters");
    console.log(messageToCountLetters);
    console.log("removeUpperCaseLetters");
    console.log(removeUpperCaseLetters);
    console.log("removeLowerCaseLetters");
    console.log(removeLowerCaseLetters);
    console.log("upperCaseLettersCount");
    console.log(upperCaseLettersCount);
    console.log("lowerCaseLettersCount");
    console.log(lowerCaseLettersCount);
    console.log("originalMessageLetterCount");
    console.log(originalMessageLetterCount);
    console.log("upperCaseLettersRatioNeededToTriggerTimeout");
    console.log(upperCaseLettersRatioNeededToTriggerTimeout);
    console.log("upperCaseMessageLength");
    console.log(upperCaseMessageLength);
    */
    if (originalMessageLetterCount <= 0) {
      // No letters found here
      //console.log("No need to do maths, message has " + originalMessageLetterCount + " characters");
      doesMessageHaveTooManyUpperCaseLetters = false;
    }
    if (originalMessageLetterCount > 0) {
      //console.log("We have " + originalMessageLetterCount + " characters in the message");
      if (originalMessageLetterCount >= upperCaseMessageLength) {
        //
        //console.log("Message length is enough to timeout");
        if (upperCaseLettersCount > 0) {
          upperCaseLettersRatio = (upperCaseLettersCount / originalMessageLetterCount);
          lowerCaseLettersRatio = (lowerCaseLettersCount / originalMessageLetterCount);
          //console.log("There are " + upperCaseLettersCount + " upper case letters, let's fucking gooooooooooooooooooooooo");
          if (upperCaseLettersRatio >= upperCaseLettersRatioNeededToTriggerTimeout) {
            //
            //console.log("Hell yeah we met all criteria needed to timeout a long all caps message");
            doesMessageHaveTooManyUpperCaseLetters = true;
          }
          if (upperCaseLettersRatio < upperCaseLettersRatioNeededToTriggerTimeout) {
            //
            //console.log("Ratio not big enough, sadge");
            doesMessageHaveTooManyUpperCaseLetters = false;
          }
        }
        if (upperCaseLettersCount <= 0) {
          //console.log("There are " + upperCaseLettersCount + " upper case letters, sadge");
          doesMessageHaveTooManyUpperCaseLetters = false;
        }
      }
      if (originalMessageLetterCount < upperCaseMessageLength) {
        //
        //console.log("Message length is not enough, needs more letters");
        doesMessageHaveTooManyUpperCaseLetters = false;
      }
      // uhh yeah what do we do now
      //upperCaseLettersToLowerCaseLettersRatio = upperCaseLettersCount / lowerCaseLettersCount;
      /*
      console.log("upperCaseLettersRatio");
      console.log(upperCaseLettersRatio);
      console.log("lowerCaseLettersRatio");
      console.log(lowerCaseLettersRatio);
      */
    }
    //console.log("doesMessageHaveTooManyUpperCaseLetters");
    //console.log(doesMessageHaveTooManyUpperCaseLetters);
    /*
    if (upperCaseLettersCount <= 0) {
      //
    }
    if (upperCaseLettersCount > 0) {
      //
    }
    if (lowerCaseLettersCount <= 0) {
      //
    }
    if (lowerCaseLettersCount > 0) {
      //
    }
    let upperCaseLettersRatio = (upperCaseLettersCount / originalMessageLetterCount);
    let lowerCaseLettersRatio = (lowerCaseLettersCount / originalMessageLetterCount);
    let upperCaseLettersToLowerCaseLettersRatio = upperCaseLettersCount / lowerCaseLettersCount;
    */

    //console.log("singleMessageSpamBots");
    //console.log(singleMessageSpamBots);
    //console.log("slurDetection");
    //console.log(slurDetection);
    //console.log("multiMessageSpamBotTypeA");
    //console.log(multiMessageSpamBotTypeA);
    //console.log("multiMessageSpamBotTypeB");
    //console.log(multiMessageSpamBotTypeB);
    //console.log("multiMessageSpamBotTypeC");
    //console.log(multiMessageSpamBotTypeC);
    //console.log("multiMessageSpamBotTypeD");
    //console.log(multiMessageSpamBotTypeD);
    //console.log("multiMessageSpamBotTypeE");
    //console.log(multiMessageSpamBotTypeE);
    let isSingleMessageSpamBot = false;
    let isFirstMessageSpam = false;
    let isPossibleMultiMessageSpamBot = false;
    for (let singleMessageSpamBotsIndex = 0; singleMessageSpamBotsIndex < singleMessageSpamBots.length; singleMessageSpamBotsIndex++) {
      if (singleMessageSpamBots[singleMessageSpamBotsIndex] == true) {
        isSingleMessageSpamBot = globalConfig.ban_spambots;
        //console.log("The regex at index " + singleMessageSpamBotsIndex + " is " + singleMessageSpamBots[singleMessageSpamBotsIndex] + " out of " + (singleMessageSpamBots.length - 1));
        //isFirstMessageSpam = true;
        //console.log("We have a single message spam bot maybe, idk still have to check the database");
      }
    }
    for (let multiMessageSpamBotTypeAIndex = 0; multiMessageSpamBotTypeAIndex < multiMessageSpamBotTypeA.length; multiMessageSpamBotTypeAIndex++) {
      if (multiMessageSpamBotTypeA[multiMessageSpamBotTypeAIndex] == true) {
        isFirstMessageSpam = globalConfig.ban_spambots;
        //console.log("We have a multimessage spambot type A, we have to check all the messages it sends tho for confirmation");
      }
    }
    for (let multiMessageSpamBotTypeBIndex = 0; multiMessageSpamBotTypeBIndex < multiMessageSpamBotTypeB.length; multiMessageSpamBotTypeBIndex++) {
      if (multiMessageSpamBotTypeB[multiMessageSpamBotTypeBIndex] == true) {
        isFirstMessageSpam = globalConfig.ban_spambots;
        //console.log("We have a multimessage spambot type B, we have to check all the messages it sends tho for confirmation");
      }
    }
    for (let multiMessageSpamBotTypeCIndex = 0; multiMessageSpamBotTypeCIndex < multiMessageSpamBotTypeC.length; multiMessageSpamBotTypeCIndex++) {
      if (multiMessageSpamBotTypeC[multiMessageSpamBotTypeCIndex] == true) {
        isFirstMessageSpam = globalConfig.ban_spambots;
        //console.log("We have a multimessage spambot type C, we have to check all the messages it sends tho for confirmation");
      }
    }
    for (let multiMessageSpamBotTypeDIndex = 0; multiMessageSpamBotTypeDIndex < multiMessageSpamBotTypeD.length; multiMessageSpamBotTypeDIndex++) {
      if (multiMessageSpamBotTypeD[multiMessageSpamBotTypeDIndex] == true) {
        isFirstMessageSpam = globalConfig.ban_spambots;
        //console.log("We have a multimessage spambot type D, we have to check all the messages it sends tho for confirmation");
      }
    }
    for (let multiMessageSpamBotTypeEIndex = 0; multiMessageSpamBotTypeEIndex < multiMessageSpamBotTypeE.length; multiMessageSpamBotTypeEIndex++) {
      if (multiMessageSpamBotTypeE[multiMessageSpamBotTypeEIndex] == true) {
        isFirstMessageSpam = globalConfig.ban_spambots;
        //console.log("We have a multimessage spambot type E, we have to check all the messages it sends tho for confirmation");
      }
    }

    if (isSingleMessageSpamBot == false && slurDetection == false && doesMessageHaveTooManyUpperCaseLetters == false && originalMessage.length < globalConfig.long_message_length) {
      if (globalConfig.send_introductory_messages_to_new_users_using_twitch_tags == true) {
        if (isFirstTwitchMessage == true) {
          client.reply(target, "@" + usernameToPing + " " + globalConfig.introductory_message_to_new_users, messageId); // Add spambot and slur moderation here (DONE, see below)
        }
      }
      if (globalConfig.send_welcome_back_messages_to_returning_users_using_twitch_tags == true) {
        if (isReturningChatter == true) {
          client.reply(target, "@" + usernameToPing + " " + globalConfig.introductory_message_to_returning_users, messageId); // Add spambot and slur moderation here (DONE, see below)
        }
      }
    }
    if (isSingleMessageSpamBot == true || slurDetection == true || doesMessageHaveTooManyUpperCaseLetters == true || originalMessage.length >= globalConfig.long_message_length) {
      if (globalConfig.send_introductory_messages_to_new_users_using_twitch_tags == true) {
        if (isFirstTwitchMessage == true) {
          if (isSingleMessageSpamBot == true) {
            console.log("BAN THAT MOTHERFUCKER A");
            //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            banTwitchUser(roomId, userId, null, "@" + usernameToPing + " You were banned because you got detected as spam bot.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            if (globalConfig.send_messages_to_moderated_user == true) {
              client.reply(target, "@" + usernameToPing + " You were banned because you got detected as spam bot.", messageId);
            }
            if (globalConfig.send_whispers_to_moderated_user == true) {
              sendTwitchWhisper(userId, "@" + usernameToPing + " You were banned because you got detected as spam bot. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ". It is possible your account may have been compromised and is being used to send malicious links to multiple streams.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            }
            if (chatConfig.send_debug_channel_messages == true) {
              client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + true + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Banned, detected as spam bot. [MB MODBOT MB]");
            }
          }
          if (slurDetection == true) {
            if (globalConfig.permaban_when_slur_is_detected == true) {
              // Tell the user they got banned for sending a slur, and that sending slurs, no matter the context, severity, or how known the user is, will still be an unappealable permanent ban
              //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              banTwitchUser(roomId, userId, null, "@" + usernameToPing + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              if (globalConfig.send_messages_to_moderated_user == true) {
                client.reply(target, "@" + usernameToPing + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", messageId);
              }
              if (globalConfig.send_whispers_to_moderated_user == true) {
                sendTwitchWhisper(userId, "@" + usernameToPing + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              }
              if (chatConfig.send_debug_channel_messages == true) {
                client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + true + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Banned, sent a slur. [MB MODBOT MB]");
              }
            }
            if (globalConfig.permaban_when_slur_is_detected == false) {
              // Tell the user they got banned for sending a slur, and that sending slurs, no matter the context, severity, or how known the user is, will still be an unappealable permanent ban
              //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              banTwitchUser(roomId, userId, globalConfig.slur_detection_timeout, "@" + usernameToPing + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              if (globalConfig.send_messages_to_moderated_user == true) {
                client.reply(target, "@" + usernameToPing + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", messageId);
              }
              if (globalConfig.send_whispers_to_moderated_user == true) {
                sendTwitchWhisper(userId, "@" + usernameToPing + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              }
              if (chatConfig.send_debug_channel_messages == true) {
                client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + false + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Timeout, sent a slur. [MB MODBOT MB]");
              }
            }
          }
          if (doesMessageHaveTooManyUpperCaseLetters == true || originalMessage.length >= globalConfig.long_message_length) {
            if (globalConfig.warn_if_message_is_long == true) {
              if (globalConfig.send_messages_to_moderated_user == true) {
                if (originalMessage.length < globalConfig.long_message_length && doesMessageHaveTooManyUpperCaseLetters == true) {
                  client.reply(target, "@" + usernameToPing + " Your message contains too many caps, please calm down!", messageId);
                }
                if (originalMessage.length >= globalConfig.long_message_length) {
                  client.reply(target, "@" + usernameToPing + " Your message is too long, please calm down!", messageId);
                }
              }
            }
            if (globalConfig.warn_if_message_is_long == false) {
              if (originalMessage.length < globalConfig.long_message_length && doesMessageHaveTooManyUpperCaseLetters == true) {
                //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                banTwitchUser(roomId, userId, globalConfig.all_caps_message_timeout, "@" + usernameToPing + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your first message contains too many caps, please calm down!", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                if (globalConfig.send_messages_to_moderated_user == true) {
                  client.reply(target, "@" + usernameToPing + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your first message contains too many caps, please calm down!", messageId);
                }
                if (globalConfig.send_whispers_to_moderated_user == true) {
                  sendTwitchWhisper(userId, "@" + usernameToPing + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your first message contains too many caps, please calm down! This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                }
                if (chatConfig.send_debug_channel_messages == true) {
                  client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + false + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message contains too many caps. [MB MODBOT MB]");
                }
              }
              if (originalMessage.length >= globalConfig.long_message_length) {
                //console.log("First message is too long, do something about it A");
                if (globalConfig.permaban_if_first_message_is_long == true) {
                  //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  banTwitchUser(roomId, userId, null, "@" + usernameToPing + " You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  if (globalConfig.send_messages_to_moderated_user == true) {
                    client.reply(target, "@" + usernameToPing + " You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", messageId);
                  }
                  if (globalConfig.send_whispers_to_moderated_user == true) {
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You were banned because your first message is too long, you're either a spam bot, or just came here to spam. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  }
                  if (chatConfig.send_debug_channel_messages == true) {
                    client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + true + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Banned, first message too long. [MB MODBOT MB]");
                  }
                }
                if (globalConfig.permaban_if_first_message_is_long == false) {
                  //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  banTwitchUser(roomId, userId, globalConfig.long_message_timeout, "@" + usernameToPing + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your first message is too long, please calm down!", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  if (globalConfig.send_messages_to_moderated_user == true) {
                    client.reply(target, "@" + usernameToPing + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your first message is too long, please calm down!", messageId);
                  }
                  if (globalConfig.send_whispers_to_moderated_user == true) {
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your first message is too long, please calm down! This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  }
                  if (chatConfig.send_debug_channel_messages == true) {
                    client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + false + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message too long. [MB MODBOT MB]");
                  }
                }
              }
            }
          }
        }
        if (isFirstTwitchMessage == false) {
          if (isSingleMessageSpamBot == true) {
            /*
            console.log("BAN THAT MOTHERFUCKER B");
            //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            banTwitchUser(roomId, userId, null, "@" + usernameToPing + " You were banned because you got detected as spam bot.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            if (globalConfig.send_messages_to_moderated_user == true) {
              client.reply(target, "@" + usernameToPing + " You were banned because you got detected as spam bot.", messageId);
            }
            if (globalConfig.send_whispers_to_moderated_user == true) {
              sendTwitchWhisper(userId, "@" + usernameToPing + " You were banned because you got detected as spam bot. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ". It is possible your account may have been compromised and is being used to send malicious links to multiple streams.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            }
            if (chatConfig.send_debug_channel_messages == true) {
              client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + true + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Banned, detected as spam bot. [MB MODBOT MB]");
            }
            */
          }
          if (slurDetection == true) {
            if (globalConfig.permaban_when_slur_is_detected == true) {
              // Tell the user they got banned for sending a slur, and that sending slurs, no matter the context, severity, or how known the user is, will still be an unappealable permanent ban
              //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              banTwitchUser(roomId, userId, null, "@" + usernameToPing + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              if (globalConfig.send_messages_to_moderated_user == true) {
                client.reply(target, "@" + usernameToPing + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", messageId);
              }
              if (globalConfig.send_whispers_to_moderated_user == true) {
                sendTwitchWhisper(userId, "@" + usernameToPing + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              }
              if (chatConfig.send_debug_channel_messages == true) {
                client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + true + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Banned, sent a slur. [MB MODBOT MB]");
              }
            }
            if (globalConfig.permaban_when_slur_is_detected == false) {
              // Tell the user they got banned for sending a slur, and that sending slurs, no matter the context, severity, or how known the user is, will still be an unappealable permanent ban
              //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              banTwitchUser(roomId, userId, globalConfig.slur_detection_timeout, "@" + usernameToPing + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              if (globalConfig.send_messages_to_moderated_user == true) {
                client.reply(target, "@" + usernameToPing + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", messageId);
              }
              if (globalConfig.send_whispers_to_moderated_user == true) {
                sendTwitchWhisper(userId, "@" + usernameToPing + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              }
              if (chatConfig.send_debug_channel_messages == true) {
                client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + false + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Timeout, sent a slur. [MB MODBOT MB]");
              }
            }
          }
          if (doesMessageHaveTooManyUpperCaseLetters == true || originalMessage.length >= globalConfig.long_message_length) {
            if (globalConfig.warn_if_message_is_long == true) {
              if (globalConfig.send_messages_to_moderated_user == true) {
                if (originalMessage.length < globalConfig.long_message_length && doesMessageHaveTooManyUpperCaseLetters == true) {
                  client.reply(target, "@" + usernameToPing + " Your message contains too many caps, please calm down!", messageId);
                }
                if (originalMessage.length >= globalConfig.long_message_length) {
                  client.reply(target, "@" + usernameToPing + " Your message is too long, please calm down!", messageId);
                }
              }
            }
            if (globalConfig.warn_if_message_is_long == false) {
              if (originalMessage.length < globalConfig.long_message_length && doesMessageHaveTooManyUpperCaseLetters == true) {
                //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                banTwitchUser(roomId, userId, globalConfig.all_caps_message_timeout, "@" + usernameToPing + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your message contains too many caps, please calm down!", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                if (globalConfig.send_messages_to_moderated_user == true) {
                  client.reply(target, "@" + usernameToPing + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your message contains too many caps, please calm down!", messageId);
                }
                if (globalConfig.send_whispers_to_moderated_user == true) {
                  sendTwitchWhisper(userId, "@" + usernameToPing + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your message contains too many caps, please calm down! This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                }
                if (chatConfig.send_debug_channel_messages == true) {
                  client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + false + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Timeout, message contains too many caps. [MB MODBOT MB]");
                }
              }
              if (originalMessage.length >= globalConfig.long_message_length) {
                //console.log("message is too long, do something about it A");
                if (globalConfig.permaban_if_first_message_is_long == true) {
                  //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  banTwitchUser(roomId, userId, null, "@" + usernameToPing + " You were banned because your message is too long, you're either a spam bot, or just came here to spam.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  if (globalConfig.send_messages_to_moderated_user == true) {
                    client.reply(target, "@" + usernameToPing + " You were banned because your message is too long, you're either a spam bot, or just came here to spam.", messageId);
                  }
                  if (globalConfig.send_whispers_to_moderated_user == true) {
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You were banned because your message is too long, you're either a spam bot, or just came here to spam. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  }
                  if (chatConfig.send_debug_channel_messages == true) {
                    client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + true + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Banned, message too long. [MB MODBOT MB]");
                  }
                }
                if (globalConfig.permaban_if_first_message_is_long == false) {
                  //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  banTwitchUser(roomId, userId, globalConfig.long_message_timeout, "@" + usernameToPing + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down!", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  if (globalConfig.send_messages_to_moderated_user == true) {
                    client.reply(target, "@" + usernameToPing + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down!", messageId);
                  }
                  if (globalConfig.send_whispers_to_moderated_user == true) {
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down! This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  }
                  if (chatConfig.send_debug_channel_messages == true) {
                    client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + false + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Timeout, message too long. [MB MODBOT MB]");
                  }
                }
              }
            }
          }
        }
      }
      if (globalConfig.send_welcome_back_messages_to_returning_users_using_twitch_tags == true) {
        if (isReturningChatter == true) {
          if (isSingleMessageSpamBot == true) {
            /*
            console.log("BAN THAT MOTHERFUCKER C");
            //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            banTwitchUser(roomId, userId, null, "@" + usernameToPing + " You were banned because you got detected as spam bot.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            if (globalConfig.send_messages_to_moderated_user == true) {
              client.reply(target, "@" + usernameToPing + " You were banned because you got detected as spam bot.", messageId);
            }
            if (globalConfig.send_whispers_to_moderated_user == true) {
              sendTwitchWhisper(userId, "@" + usernameToPing + " You were banned because you got detected as spam bot. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ". It is possible your account may have been compromised and is being used to send malicious links to multiple streams.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            }
            if (chatConfig.send_debug_channel_messages == true) {
              client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + true + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Banned, detected as spam bot. [MB MODBOT MB]");
            }
            */
          }
          if (slurDetection == true) {
            if (globalConfig.permaban_when_slur_is_detected == true) {
              // Tell the user they got banned for sending a slur, and that sending slurs, no matter the context, severity, or how known the user is, will still be an unappealable permanent ban
              //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              banTwitchUser(roomId, userId, null, "@" + usernameToPing + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              if (globalConfig.send_messages_to_moderated_user == true) {
                client.reply(target, "@" + usernameToPing + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", messageId);
              }
              if (globalConfig.send_whispers_to_moderated_user == true) {
                sendTwitchWhisper(userId, "@" + usernameToPing + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              }
              if (chatConfig.send_debug_channel_messages == true) {
                client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + true + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Banned, sent a slur. [MB MODBOT MB]");
              }
            }
            if (globalConfig.permaban_when_slur_is_detected == false) {
              // Tell the user they got banned for sending a slur, and that sending slurs, no matter the context, severity, or how known the user is, will still be an unappealable permanent ban
              //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              banTwitchUser(roomId, userId, globalConfig.slur_detection_timeout, "@" + usernameToPing + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              if (globalConfig.send_messages_to_moderated_user == true) {
                client.reply(target, "@" + usernameToPing + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", messageId);
              }
              if (globalConfig.send_whispers_to_moderated_user == true) {
                sendTwitchWhisper(userId, "@" + usernameToPing + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              }
              if (chatConfig.send_debug_channel_messages == true) {
                client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + false + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Timeout, sent a slur. [MB MODBOT MB]");
              }
            }
          }
          if (doesMessageHaveTooManyUpperCaseLetters == true || originalMessage.length >= globalConfig.long_message_length) {
            if (globalConfig.warn_if_message_is_long == true) {
              if (globalConfig.send_messages_to_moderated_user == true) {
                if (originalMessage.length < globalConfig.long_message_length && doesMessageHaveTooManyUpperCaseLetters == true) {
                  client.reply(target, "@" + usernameToPing + " Your message contains too many caps, please calm down!", messageId);
                }
                if (originalMessage.length >= globalConfig.long_message_length) {
                  client.reply(target, "@" + usernameToPing + " Your message is too long, please calm down!", messageId);
                }
              }
            }
            if (globalConfig.warn_if_message_is_long == false) {
              if (originalMessage.length < globalConfig.long_message_length && doesMessageHaveTooManyUpperCaseLetters == true) {
                //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                banTwitchUser(roomId, userId, globalConfig.all_caps_message_timeout, "@" + usernameToPing + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your message contains too many caps, please calm down!", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                if (globalConfig.send_messages_to_moderated_user == true) {
                  client.reply(target, "@" + usernameToPing + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your message contains too many caps, please calm down!", messageId);
                }
                if (globalConfig.send_whispers_to_moderated_user == true) {
                  sendTwitchWhisper(userId, "@" + usernameToPing + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your message contains too many caps, please calm down! This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                }
                if (chatConfig.send_debug_channel_messages == true) {
                  client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + false + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Timeout, message contains too many caps. [MB MODBOT MB]");
                }
              }
              if (originalMessage.length >= globalConfig.long_message_length) {
                //console.log("message is too long, do something about it A");
                if (globalConfig.permaban_if_first_message_is_long == true) {
                  //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  banTwitchUser(roomId, userId, null, "@" + usernameToPing + " You were banned because your message is too long, you're either a spam bot, or just came here to spam.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  if (globalConfig.send_messages_to_moderated_user == true) {
                    client.reply(target, "@" + usernameToPing + " You were banned because your message is too long, you're either a spam bot, or just came here to spam.", messageId);
                  }
                  if (globalConfig.send_whispers_to_moderated_user == true) {
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You were banned because your message is too long, you're either a spam bot, or just came here to spam. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  }
                  if (chatConfig.send_debug_channel_messages == true) {
                    client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + true + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Banned, message too long. [MB MODBOT MB]");
                  }
                }
                if (globalConfig.permaban_if_first_message_is_long == false) {
                  //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  banTwitchUser(roomId, userId, globalConfig.long_message_timeout, "@" + usernameToPing + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down!", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  if (globalConfig.send_messages_to_moderated_user == true) {
                    client.reply(target, "@" + usernameToPing + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down!", messageId);
                  }
                  if (globalConfig.send_whispers_to_moderated_user == true) {
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down! This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  }
                  if (chatConfig.send_debug_channel_messages == true) {
                    client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + false + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Timeout, message too long. [MB MODBOT MB]");
                  }
                }
              }
            }
          }
        }
        if (isReturningChatter == false) {
          if (isSingleMessageSpamBot == true) {
            /*
            console.log("BAN THAT MOTHERFUCKER D");
            //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            banTwitchUser(roomId, userId, null, "@" + usernameToPing + " You were banned because you got detected as spam bot.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            if (globalConfig.send_messages_to_moderated_user == true) {
              client.reply(target, "@" + usernameToPing + " You were banned because you got detected as spam bot.", messageId);
            }
            if (globalConfig.send_whispers_to_moderated_user == true) {
              sendTwitchWhisper(userId, "@" + usernameToPing + " You were banned because you got detected as spam bot. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ". It is possible your account may have been compromised and is being used to send malicious links to multiple streams.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
            }
            if (chatConfig.send_debug_channel_messages == true) {
              client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + true + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Banned, detected as spam bot. [MB MODBOT MB]");
            }
            */
          }
          if (slurDetection == true) {
            if (globalConfig.permaban_when_slur_is_detected == true) {
              // Tell the user they got banned for sending a slur, and that sending slurs, no matter the context, severity, or how known the user is, will still be an unappealable permanent ban
              //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              banTwitchUser(roomId, userId, null, "@" + usernameToPing + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              if (globalConfig.send_messages_to_moderated_user == true) {
                client.reply(target, "@" + usernameToPing + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", messageId);
              }
              if (globalConfig.send_whispers_to_moderated_user == true) {
                sendTwitchWhisper(userId, "@" + usernameToPing + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              }
              if (chatConfig.send_debug_channel_messages == true) {
                client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + true + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Banned, sent a slur. [MB MODBOT MB]");
              }
            }
            if (globalConfig.permaban_when_slur_is_detected == false) {
              // Tell the user they got banned for sending a slur, and that sending slurs, no matter the context, severity, or how known the user is, will still be an unappealable permanent ban
              //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              banTwitchUser(roomId, userId, globalConfig.slur_detection_timeout, "@" + usernameToPing + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              if (globalConfig.send_messages_to_moderated_user == true) {
                client.reply(target, "@" + usernameToPing + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", messageId);
              }
              if (globalConfig.send_whispers_to_moderated_user == true) {
                sendTwitchWhisper(userId, "@" + usernameToPing + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
              }
              if (chatConfig.send_debug_channel_messages == true) {
                client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + false + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Timeout, sent a slur. [MB MODBOT MB]");
              }
            }
          }
          if (doesMessageHaveTooManyUpperCaseLetters == true || originalMessage.length >= globalConfig.long_message_length) {
            if (globalConfig.warn_if_message_is_long == true) {
              if (globalConfig.send_messages_to_moderated_user == true) {
                if (originalMessage.length < globalConfig.long_message_length && doesMessageHaveTooManyUpperCaseLetters == true) {
                  client.reply(target, "@" + usernameToPing + " Your message contains too many caps, please calm down!", messageId);
                }
                if (originalMessage.length >= globalConfig.long_message_length) {
                  client.reply(target, "@" + usernameToPing + " Your message is too long, please calm down!", messageId);
                }
              }
            }
            if (globalConfig.warn_if_message_is_long == false) {
              if (originalMessage.length < globalConfig.long_message_length && doesMessageHaveTooManyUpperCaseLetters == true) {
                //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                banTwitchUser(roomId, userId, globalConfig.all_caps_message_timeout, "@" + usernameToPing + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your message contains too many caps, please calm down!", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                if (globalConfig.send_messages_to_moderated_user == true) {
                  client.reply(target, "@" + usernameToPing + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your message contains too many caps, please calm down!", messageId);
                }
                if (globalConfig.send_whispers_to_moderated_user == true) {
                  sendTwitchWhisper(userId, "@" + usernameToPing + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your message contains too many caps, please calm down! This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                }
                if (chatConfig.send_debug_channel_messages == true) {
                  client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + false + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Timeout, message contains too many caps. [MB MODBOT MB]");
                }
              }
              if (originalMessage.length >= globalConfig.long_message_length) {
                //console.log("message is too long, do something about it A");
                if (globalConfig.permaban_if_first_message_is_long == true) {
                  //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  banTwitchUser(roomId, userId, null, "@" + usernameToPing + " You were banned because your message is too long, you're either a spam bot, or just came here to spam.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  if (globalConfig.send_messages_to_moderated_user == true) {
                    client.reply(target, "@" + usernameToPing + " You were banned because your message is too long, you're either a spam bot, or just came here to spam.", messageId);
                  }
                  if (globalConfig.send_whispers_to_moderated_user == true) {
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You were banned because your message is too long, you're either a spam bot, or just came here to spam. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  }
                  if (chatConfig.send_debug_channel_messages == true) {
                    client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + true + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Banned, message too long. [MB MODBOT MB]");
                  }
                }
                if (globalConfig.permaban_if_first_message_is_long == false) {
                  //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  banTwitchUser(roomId, userId, globalConfig.long_message_timeout, "@" + usernameToPing + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down!", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  if (globalConfig.send_messages_to_moderated_user == true) {
                    client.reply(target, "@" + usernameToPing + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down!", messageId);
                  }
                  if (globalConfig.send_whispers_to_moderated_user == true) {
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down! This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                    sendTwitchWhisper(userId, "@" + usernameToPing + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                  }
                  if (chatConfig.send_debug_channel_messages == true) {
                    client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + userId + ", last_username_to_ping=" + usernameToPing + ", last_message_sent_id=" + messageId + ", last_message_sent=" + originalMessage + ", last_message_sent_at=" + internalMessageTimestampIsoString + ", last_message_length=" + originalMessage.length + ", is_first_twitch_message=" + isFirstTwitchMessage + ", is_returning_chatter=" + isReturningChatter + ", is_account_blacklisted=" + false + ", is_banned=" + false + ", is_first_message_spam_bot=" + isFirstMessageSpam + ", is_spam_bot=" + isSingleMessageSpamBot + ", roomId=" + roomId + ", target=" + target + " Timeout, message too long. [MB MODBOT MB]");
                  }
                }
              }
            }
          }
        }
      }
    }

    //console.log("isSingleMessageSpamBot = " + isSingleMessageSpamBot);

    // The database checks below checks if an user exists
    // MOVE THIS UP TO WHERE THE MESSAGE ISNT MODIFIED
    // LIKE HERE
    if (globalConfig.use_databases == true) {
      mongoClient.connect(mongoUrl, {
        useUnifiedTopology: true
      }, function(userDbError, userDb) {
        //isDatabaseBusy = true;
        if (userDbError) {
          throw userDbError;
        }
        let userDatabase = userDb.db(globalConfig.main_database_name.replace(/({{channel_id}})+/ig, roomId));
        userDatabase.collection(globalConfig.chatters_collection_name.replace(/({{channel_id}})+/ig, roomId)).findOne({
          user_id: userId
        }, function(resultError, result) {
          if (resultError) {
            throw resultError;
          }
          //console.log(result);
          //isNullDatabase = result;
          if (result === null) {
            //console.log("User doesn't exist AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
            //
            mongoClient.connect(mongoUrl, {
              useUnifiedTopology: true
            }, function(databaseToCreateError, databaseToCreate) {
              if (databaseToCreateError) {
                throw databaseToCreateError;
              }
              let userDatabaseToCreate = databaseToCreate.db(globalConfig.main_database_name.replace(/({{channel_id}})+/ig, roomId));
              let dataToInsert = {
                user_id: userId,

                first_known_username: username,
                first_known_display_name: displayName,
                first_user_color: twitchUserColor,
                first_username_to_ping: usernameToPing,

                last_known_username: username,
                last_known_display_name: displayName,
                last_user_color: twitchUserColor,
                last_username_to_ping: usernameToPing,

                randomly_generated_color: randomColor,

                messages_sent: 1,

                is_first_twitch_message: isFirstTwitchMessage,
                is_returning_chatter: isReturningChatter,

                first_message_sent_id: messageId,
                first_message_sent: originalMessage,
                first_message_sent_at_timestamp: internalMessageTimestamp,
                first_message_sent_at_iso_timestamp: internalMessageTimestampIsoString,
                first_message_sent_at_twitch_timestamp: twitchMessageTimestamp,
                first_message_sent_at_twitch_iso_timestamp: twitchMessageTimestampIsoString,
                first_message_length: originalMessage.length,
                is_first_message_basic_input: false,
                is_first_message_advanced_input: false,
                first_basic_input: "",
                first_advanced_input: "",

                last_message_sent_id: messageId,
                last_message_sent: originalMessage,
                last_message_sent_at_timestamp: internalMessageTimestamp,
                last_message_sent_at_iso_timestamp: internalMessageTimestampIsoString,
                last_message_sent_at_twitch_timestamp: twitchMessageTimestamp,
                last_message_sent_at_twitch_iso_timestamp: twitchMessageTimestampIsoString,
                last_message_length: originalMessage.length,
                is_last_message_basic_input: false,
                is_last_message_advanced_input: false,
                last_basic_input: "",
                last_advanced_input: "",

                shortest_message_sent_id: messageId,
                shortest_message_sent: originalMessage,
                shortest_message_sent_at_timestamp: internalMessageTimestamp,
                shortest_message_sent_at_iso_timestamp: internalMessageTimestampIsoString,
                shortest_message_sent_at_twitch_timestamp: twitchMessageTimestamp,
                shortest_message_sent_at_twitch_iso_timestamp: twitchMessageTimestampIsoString,
                shortest_message_length: originalMessage.length,

                longest_message_sent_id: messageId,
                longest_message_sent: originalMessage,
                longest_message_sent_at_timestamp: internalMessageTimestamp,
                longest_message_sent_at_iso_timestamp: internalMessageTimestampIsoString,
                longest_message_sent_at_twitch_timestamp: twitchMessageTimestamp,
                longest_message_sent_at_twitch_iso_timestamp: twitchMessageTimestampIsoString,
                longest_message_length: originalMessage.length,

                basic_inputs_sent: 0,
                advanced_inputs_sent: 0,
                total_inputs_sent: 0,
                ban_count: 0,
                strike_count: 0,
                timeout_count: 0,
                message_deletion_count: 0,
                is_account_blacklisted: false,
                is_banned: false,
                is_first_message_spam_bot: isFirstMessageSpam,
                is_spam_bot: isSingleMessageSpamBot
              };
              if (isFirstMessageSpam == false) {
                if (dataToInsert.first_message_sent_id == dataToInsert.last_message_sent_id) {
                  if (doesMessageHaveTooManyUpperCaseLetters == true) {
                    dataToInsert.timeout_count = dataToInsert.timeout_count + 1;
                  }
                  if (dataToInsert.first_message_length >= globalConfig.long_message_length) {
                    if (globalConfig.permaban_if_first_message_is_long == true) {
                      dataToInsert.ban_count = dataToInsert.ban_count + 1;
                      //dataToInsert.is_account_blacklisted = true;
                      dataToInsert.is_banned = true;
                    }
                    if (globalConfig.permaban_if_first_message_is_long == false) {
                      dataToInsert.timeout_count = dataToInsert.timeout_count + 1;
                    }
                  }
                }
              }
              if (slurDetection == true) {
                if (globalConfig.permaban_when_slur_is_detected == true) {
                  dataToInsert.strike_count = dataToInsert.strike_count + 1;
                  dataToInsert.ban_count = dataToInsert.ban_count + 1;
                  dataToInsert.is_account_blacklisted = true;
                  dataToInsert.is_banned = true;
                }
                if (globalConfig.permaban_when_slur_is_detected == false) {
                  dataToInsert.strike_count = dataToInsert.strike_count + 1;
                  dataToInsert.timeout_count = dataToInsert.timeout_count + 1;
                }
              }
              if (isFirstMessageSpam == true) {
                dataToInsert.strike_count = dataToInsert.strike_count + 1;
              }
              if (isSingleMessageSpamBot == true) {
                dataToInsert.ban_count = dataToInsert.ban_count + 1;
                dataToInsert.is_account_blacklisted = true;
                dataToInsert.is_banned = true;
              }
              if (dataToInsert.is_account_blacklisted == true) {
                dataToInsert.message_deletion_count = dataToInsert.message_deletion_count + 1;
              }
              /*
              if (checkBigFollowsSpamBot == true) {
                dataToInsert = {
                  user_id: userId,
                  messages_sent: 1,
                  input_count: 0,
                  ban_count: 1,
                  is_spam_bot: true
                };
              }
              if (checkBigFollowsSpamBot == false) {
                dataToInsert = {
                  user_id: userId,
                  messages_sent: 1,
                  input_count: 0,
                  ban_count: 0,
                  is_spam_bot: false
                };
              }
              */
              userDatabaseToCreate.collection(globalConfig.chatters_collection_name.replace(/({{channel_id}})+/ig, roomId)).insertOne(dataToInsert, function(resError, res) {
                if (resError) {
                  throw resError;
                }
                //console.log("1 document inserted");
                mongoClient.connect(mongoUrl, {
                  useUnifiedTopology: true
                }, function(databaseToReadFromError, databaseToReadFrom) {
                  if (databaseToReadFromError) {
                    throw databaseToReadFromError;
                  }
                  let userDatabaseToReadFrom = databaseToReadFrom.db(globalConfig.main_database_name.replace(/({{channel_id}})+/ig, roomId));
                  userDatabaseToReadFrom.collection(globalConfig.chatters_collection_name.replace(/({{channel_id}})+/ig, roomId)).findOne({
                    user_id: userId
                  }, function(databaseToReadFromResultError, databaseToReadFromResult) {
                    if (databaseToReadFromResultError) {
                      throw databaseToReadFromResultError;
                    }
                    databaseToReadFrom.close();
                    //console.log("databaseToReadFromResult");
                    //console.log(databaseToReadFromResult);
                    if (databaseToReadFromResult.last_user_color == null || databaseToReadFromResult.last_user_color == undefined) {
                      // This block picks the randomly generated color that was saved in the database when the user was first added to the database, and hopefully applies this color instead of using the hardcoded default color
                      userColor = databaseToReadFromResult.randomly_generated_color;
                    }
                    if (databaseToReadFromResult.first_message_sent_id == databaseToReadFromResult.last_message_sent_id) {
                      console.log("New user successfully added to database A");
                      if (chatConfig.send_debug_channel_messages == true) {
                        //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB NEW USER A MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " [MB NEW USER A MB]");
                      }
                    }
                    if (databaseToReadFromResult.first_message_sent_id != databaseToReadFromResult.last_message_sent_id) {
                      //console.log("First message ID is different from last message ID A");
                    }
                    if (databaseToReadFromResult.is_account_blacklisted == true) {
                      if (databaseToReadFromResult.is_banned == false) {
                        if (globalConfig.enable_silent_timeout == true) {
                          console.log("Silently timeout or delete message A");
                          deleteTwitchMessage(roomId, databaseToReadFromResult.last_message_sent_id, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                          logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "message_deleted", null, null, null, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Message deleted silently. [MB MODBOT MB]", new Date().getTime());
                          logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "message_deleted", null, null, null, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Message deleted silently. [MB MODBOT MB]", new Date().getTime());
                          banTwitchUser(roomId, databaseToReadFromResult.user_id, 1, null, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                          logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "timeout", 1, null, null, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Silent Timeout. [MB MODBOT MB]", new Date().getTime());
                          logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "timeout", 1, null, null, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Silent Timeout. [MB MODBOT MB]", new Date().getTime());
                        }
                      }
                    }
                    if (databaseToReadFromResult.is_account_blacklisted == false) {
                      if (databaseToReadFromResult.is_spam_bot == false) {
                        if (databaseToReadFromResult.first_message_sent_id == databaseToReadFromResult.last_message_sent_id) {
                          if (databaseToReadFromResult.first_message_length < globalConfig.long_message_length && doesMessageHaveTooManyUpperCaseLetters == true) {
                            //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            banTwitchUser(roomId, databaseToReadFromResult.user_id, globalConfig.all_caps_message_timeout, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your first message contains too many caps, please calm down!", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.all_caps_message_timeout, "You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your first message contains too many caps, please calm down!", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message contains too many caps. [MB MODBOT MB]", new Date().getTime());
                            logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.all_caps_message_timeout, "You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your first message contains too many caps, please calm down!", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message contains too many caps. [MB MODBOT MB]", new Date().getTime());
                            if (globalConfig.send_messages_to_moderated_user == true) {
                              client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your first message contains too many caps, please calm down!", databaseToReadFromResult.last_message_sent_id);
                            }
                            if (globalConfig.send_whispers_to_moderated_user == true) {
                              sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your first message contains too many caps, please calm down! This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            }
                            if (chatConfig.send_debug_channel_messages == true) {
                              client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message contains too many caps. [MB MODBOT MB]");
                            }
                          }
                          if (databaseToReadFromResult.first_message_length >= globalConfig.long_message_length) {
                            //console.log("First message is too long, do something about it A");
                            if (globalConfig.permaban_if_first_message_is_long == true) {
                              //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              banTwitchUser(roomId, databaseToReadFromResult.user_id, null, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, first message too long. [MB MODBOT MB]", new Date().getTime());
                              logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, first message too long. [MB MODBOT MB]", new Date().getTime());
                              if (globalConfig.send_messages_to_moderated_user == true) {
                                client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", databaseToReadFromResult.last_message_sent_id);
                              }
                              if (globalConfig.send_whispers_to_moderated_user == true) {
                                sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because your first message is too long, you're either a spam bot, or just came here to spam. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                                sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              }
                              if (chatConfig.send_debug_channel_messages == true) {
                                client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, first message too long. [MB MODBOT MB]");
                              }
                            }
                            if (globalConfig.permaban_if_first_message_is_long == false) {
                              //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              banTwitchUser(roomId, databaseToReadFromResult.user_id, globalConfig.long_message_timeout, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your first message is too long, please calm down!", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.long_message_timeout, "You were timed out for " + globalConfig.long_message_timeout + " seconds because your first message is too long, please calm down!", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message too long. [MB MODBOT MB]", new Date().getTime());
                              logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.long_message_timeout, "You were timed out for " + globalConfig.long_message_timeout + " seconds because your first message is too long, please calm down!", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message too long. [MB MODBOT MB]", new Date().getTime());
                              if (globalConfig.send_messages_to_moderated_user == true) {
                                client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your first message is too long, please calm down!", databaseToReadFromResult.last_message_sent_id);
                              }
                              if (globalConfig.send_whispers_to_moderated_user == true) {
                                sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your first message is too long, please calm down! This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                                sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              }
                              if (chatConfig.send_debug_channel_messages == true) {
                                client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message too long. [MB MODBOT MB]");
                              }
                            }
                          }
                        }
                      }
                    }
                    if (databaseToReadFromResult.is_spam_bot == true) {
                      console.log("BAN THAT MOTHERFUCKER E");
                      //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                      banTwitchUser(roomId, databaseToReadFromResult.user_id, null, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you got detected as spam bot.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                      logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because you got detected as spam bot.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, detected as spam bot. [MB MODBOT MB]", new Date().getTime());
                      logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because you got detected as spam bot.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, detected as spam bot. [MB MODBOT MB]", new Date().getTime());
                      if (globalConfig.send_messages_to_moderated_user == true) {
                        client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you got detected as spam bot.", databaseToReadFromResult.last_message_sent_id);
                      }
                      if (globalConfig.send_whispers_to_moderated_user == true) {
                        sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you got detected as spam bot. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ". It is possible your account may have been compromised and is being used to send malicious links to multiple streams.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                      }
                      if (chatConfig.send_debug_channel_messages == true) {
                        client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, detected as spam bot. [MB MODBOT MB]");
                      }
                    }
                    if (databaseToReadFromResult.is_first_message_spam_bot == true) {
                      console.log("Keep an eye on this user");
                    }
                    if (slurDetection == true) {
                      if (globalConfig.permaban_when_slur_is_detected == true) {
                        // Tell the user they got banned for sending a slur, and that sending slurs, no matter the context, severity, or how known the user is, will still be an unappealable permanent ban
                        //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        banTwitchUser(roomId, databaseToReadFromResult.user_id, null, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "ban", null, "ou were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, sent a slur. [MB MODBOT MB]", new Date().getTime());
                        logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "ban", null, "ou were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, sent a slur. [MB MODBOT MB]", new Date().getTime());
                        if (globalConfig.send_messages_to_moderated_user == true) {
                          client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", databaseToReadFromResult.last_message_sent_id);
                        }
                        if (globalConfig.send_whispers_to_moderated_user == true) {
                          sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        }
                        if (chatConfig.send_debug_channel_messages == true) {
                          client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, sent a slur. [MB MODBOT MB]");
                        }
                      }
                      if (globalConfig.permaban_when_slur_is_detected == false) {
                        // Tell the user they got banned for sending a slur, and that sending slurs, no matter the context, severity, or how known the user is, will still be an unappealable permanent ban
                        //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        banTwitchUser(roomId, databaseToReadFromResult.user_id, globalConfig.slur_detection_timeout, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.slur_detection_timeout, "You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, sent a slur. [MB MODBOT MB]", new Date().getTime());
                        logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.slur_detection_timeout, "You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, sent a slur. [MB MODBOT MB]", new Date().getTime());
                        if (globalConfig.send_messages_to_moderated_user == true) {
                          client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", databaseToReadFromResult.last_message_sent_id);
                        }
                        if (globalConfig.send_whispers_to_moderated_user == true) {
                          sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        }
                        if (chatConfig.send_debug_channel_messages == true) {
                          client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, sent a slur. [MB MODBOT MB]");
                        }
                      }
                    }
                  });
                });
                databaseToCreate.close();
              });
            });
            //
            //test();
          }
          if (result !== null) {
            //console.log("User exists BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB");
            //console.log("result");
            //console.log(result);
            mongoClient.connect(mongoUrl, {
              useUnifiedTopology: true
            }, function(databaseToUpdateError, databaseToUpdate) {
              if (databaseToUpdateError) {
                throw databaseToUpdateError;
              }
              let userDatabaseToUpdate = databaseToUpdate.db(globalConfig.main_database_name.replace(/({{channel_id}})+/ig, roomId));
              let dataToQuery = {
                user_id: userId
              };
              let dataToUpdate = {
                $set: {
                  user_id: userId,

                  last_known_username: username,
                  last_known_display_name: displayName,
                  last_user_color: twitchUserColor,
                  last_username_to_ping: usernameToPing,

                  messages_sent: result.messages_sent + 1,

                  //is_first_twitch_message: result.is_first_twitch_message,
                  //is_returning_chatter: result.is_returning_chatter,
                  is_first_twitch_message: isFirstTwitchMessage,
                  is_returning_chatter: isReturningChatter,

                  last_message_sent_id: messageId,
                  last_message_sent: originalMessage,
                  last_message_sent_at_timestamp: internalMessageTimestamp,
                  last_message_sent_at_iso_timestamp: internalMessageTimestampIsoString,
                  last_message_sent_at_twitch_timestamp: twitchMessageTimestamp,
                  last_message_sent_at_twitch_iso_timestamp: twitchMessageTimestampIsoString,
                  last_message_length: originalMessage.length,
                  is_last_message_basic_input: false,
                  is_last_message_advanced_input: false,

                  shortest_message_sent_id: result.shortest_message_sent_id,
                  shortest_message_sent: result.shortest_message_sent,
                  shortest_message_sent_at_timestamp: result.shortest_message_sent_at_timestamp,
                  shortest_message_sent_at_iso_timestamp: result.shortest_message_sent_at_iso_timestamp,
                  shortest_message_sent_at_twitch_timestamp: result.shortest_message_sent_at_twitch_timestamp,
                  shortest_message_sent_at_twitch_iso_timestamp: result.shortest_message_sent_at_twitch_iso_timestamp,
                  shortest_message_length: result.shortest_message_length,

                  longest_message_sent_id: result.longest_message_sent_id,
                  longest_message_sent: result.longest_message_sent,
                  longest_message_sent_at_timestamp: result.longest_message_sent_at_timestamp,
                  longest_message_sent_at_iso_timestamp: result.longest_message_sent_at_iso_timestamp,
                  longest_message_sent_at_twitch_timestamp: result.longest_message_sent_at_twitch_timestamp,
                  longest_message_sent_at_twitch_iso_timestamp: result.longest_message_sent_at_twitch_iso_timestamp,
                  longest_message_length: result.longest_message_length,

                  ban_count: result.ban_count,
                  strike_count: result.strike_count,
                  timeout_count: result.timeout_count,
                  message_deletion_count: result.message_deletion_count,
                  is_account_blacklisted: result.is_account_blacklisted,
                  is_first_message_spam_bot: result.is_first_message_spam_bot,
                  is_spam_bot: result.is_spam_bot
                }
              };
              //console.log(dataToUpdate);
              if (dataToUpdate.$set.is_returning_chatter === "" || dataToUpdate.$set.is_returning_chatter === null || dataToUpdate.$set.is_returning_chatter === undefined || dataToUpdate.$set.is_returning_chatter === "null" || dataToUpdate.$set.is_returning_chatter === "undefined") {
                // Change this value in case user already exists but the user didn't have the value in their database entry
                console.log("Changing dataToUpdate.$set.is_returning_chatter for user_id " + dataToUpdate.$set.user_id + " from " + dataToUpdate.$set.is_returning_chatter);
                dataToUpdate.$set.is_returning_chatter = false;
                console.log("To " + dataToUpdate.$set.is_returning_chatter);
              }
              if (dataToUpdate.$set.shortest_message_length > originalMessage.length) {
                console.log("Shorter message");
                dataToUpdate.$set.shortest_message_sent_id = messageId;
                dataToUpdate.$set.shortest_message_sent = originalMessage;
                dataToUpdate.$set.shortest_message_sent_at_timestamp = internalMessageTimestamp;
                dataToUpdate.$set.shortest_message_sent_at_iso_timestamp = internalMessageTimestampIsoString;
                dataToUpdate.$set.shortest_message_sent_at_twitch_timestamp = twitchMessageTimestamp;
                dataToUpdate.$set.shortest_message_sent_at_twitch_iso_timestamp = twitchMessageTimestampIsoString;
                dataToUpdate.$set.shortest_message_length = originalMessage.length;
              }
              if (dataToUpdate.$set.longest_message_length < originalMessage.length) {
                console.log("Longer message");
                dataToUpdate.$set.longest_message_sent_id = messageId;
                dataToUpdate.$set.longest_message_sent = originalMessage;
                dataToUpdate.$set.longest_message_sent_at_timestamp = internalMessageTimestamp;
                dataToUpdate.$set.longest_message_sent_at_iso_timestamp = internalMessageTimestampIsoString;
                dataToUpdate.$set.longest_message_sent_at_twitch_timestamp = twitchMessageTimestamp;
                dataToUpdate.$set.longest_message_sent_at_twitch_iso_timestamp = twitchMessageTimestampIsoString;
                dataToUpdate.$set.longest_message_length = originalMessage.length;
              }
              if (dataToUpdate.$set.is_first_message_spam_bot == true) {
                console.log("IS THIS THING WORKING 1");
                if (dataToUpdate.$set.strike_count >= 0) {
                  console.log("IS THIS THING WORKING 2");
                  if (isFirstMessageSpam == true) {
                    console.log("IS THIS THING WORKING 3");
                    dataToUpdate.$set.strike_count = dataToUpdate.$set.strike_count + 1;
                  }
                }
              }
              if (dataToUpdate.$set.is_first_message_spam_bot == true) {
                console.log("IS THIS THING WORKING 4");
                if (dataToUpdate.$set.messages_sent < 3) {
                  console.log("IS THIS THING WORKING 5");
                  if (dataToUpdate.$set.strike_count < 3) {
                    console.log("IS THIS THING WORKING 6");
                    if (dataToUpdate.$set.strike_count != dataToUpdate.$set.messages_sent) {
                      console.log("IS THIS THING WORKING 7");
                      dataToUpdate.$set.is_first_message_spam_bot = false;
                    }
                  }
                }
              }
              if (dataToUpdate.$set.is_first_message_spam_bot == true) {
                console.log("IS THIS THING WORKING 8");
                if (dataToUpdate.$set.messages_sent >= 3) {
                  console.log("IS THIS THING WORKING 9");
                  if (dataToUpdate.$set.strike_count >= 3) {
                    console.log("IS THIS THING WORKING 10");
                    if (dataToUpdate.$set.strike_count == dataToUpdate.$set.messages_sent) {
                      console.log("IS THIS THING WORKING 11");
                      dataToUpdate.$set.ban_count = dataToUpdate.$set.ban_count + 1;
                      dataToUpdate.$set.is_spam_bot = true;
                      dataToUpdate.$set.is_account_blacklisted = true;
                      dataToUpdate.$set.is_banned = true;
                    }
                  }
                }
              }
              if (slurDetection == true) {
                if (globalConfig.permaban_when_slur_is_detected == true) {
                  dataToUpdate.$set.strike_count = dataToUpdate.$set.strike_count + 1;
                  dataToUpdate.$set.ban_count = dataToUpdate.$set.ban_count + 1;
                  dataToUpdate.$set.is_account_blacklisted = true;
                  dataToUpdate.$set.is_banned = true;
                }
                if (globalConfig.permaban_when_slur_is_detected == false) {
                  dataToUpdate.$set.strike_count = dataToUpdate.$set.strike_count + 1;
                  dataToUpdate.$set.timeout_count = dataToUpdate.$set.timeout_count + 1;
                }
              }
              if (dataToUpdate.$set.is_account_blacklisted == true) {
                dataToUpdate.$set.message_deletion_count = dataToUpdate.$set.message_deletion_count + 1;
              }
              //console.log("dataToUpdate");
              //console.log(dataToUpdate);
              //console.log(newvalues);
              userDatabaseToUpdate.collection(globalConfig.chatters_collection_name.replace(/({{channel_id}})+/ig, roomId)).updateOne(dataToQuery, dataToUpdate, function(resError, res) {
                if (resError) {
                  throw resError;
                }
                //console.log(res.result);
                //console.log("1 document updated");
                mongoClient.connect(mongoUrl, {
                  useUnifiedTopology: true
                }, function(databaseToReadFromError, databaseToReadFrom) {
                  if (databaseToReadFromError) {
                    throw databaseToReadFromError;
                  }
                  let userDatabaseToReadFrom = databaseToReadFrom.db(globalConfig.main_database_name.replace(/({{channel_id}})+/ig, roomId));
                  userDatabaseToReadFrom.collection(globalConfig.chatters_collection_name.replace(/({{channel_id}})+/ig, roomId)).findOne({
                    user_id: userId
                  }, function(databaseToReadFromResultError, databaseToReadFromResult) {
                    if (databaseToReadFromResultError) {
                      throw databaseToReadFromResultError;
                    }
                    databaseToReadFrom.close();
                    //console.log("databaseToReadFromResult");
                    //console.log(databaseToReadFromResult);
                    if (databaseToReadFromResult.last_user_color == null || databaseToReadFromResult.last_user_color == undefined) {
                      // This block picks the randomly generated color that was saved in the database when the user was first added to the database, and hopefully applies this color instead of using the hardcoded default color
                      userColor = databaseToReadFromResult.randomly_generated_color;
                    }
                    if (databaseToReadFromResult.first_message_sent_id == databaseToReadFromResult.last_message_sent_id) {
                      console.log("New user successfully added to database B");
                      if (chatConfig.send_debug_channel_messages == true) {
                        //console.log("chatConfig.debug_channel = " + chatConfig.debug_channel);
                        //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB NEW USER B MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " [MB NEW USER B MB]");
                      }
                    }
                    if (databaseToReadFromResult.first_message_sent_id != databaseToReadFromResult.last_message_sent_id) {
                      //console.log("First message ID is different from last message ID B");
                    }
                    if (databaseToReadFromResult.is_account_blacklisted == true) {
                      if (databaseToReadFromResult.is_banned == false) {
                        if (globalConfig.enable_silent_timeout == true) {
                          console.log("Silently timeout or delete message B");
                          deleteTwitchMessage(roomId, databaseToReadFromResult.last_message_sent_id, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                          logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "message_deleted", null, null, null, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Message deleted silently. [MB MODBOT MB]", new Date().getTime());
                          logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "message_deleted", null, null, null, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Message deleted silently. [MB MODBOT MB]", new Date().getTime());
                          banTwitchUser(roomId, databaseToReadFromResult.user_id, 1, null, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                          logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "timeout", 1, null, null, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Silent Timeout. [MB MODBOT MB]", new Date().getTime());
                          logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "timeout", 1, null, null, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Silent Timeout. [MB MODBOT MB]", new Date().getTime());
                        }
                      }
                    }
                    if (databaseToReadFromResult.is_account_blacklisted == false) {
                      if (databaseToReadFromResult.is_spam_bot == false) {
                        if (databaseToReadFromResult.last_message_length >= globalConfig.long_message_length) {
                          // This should never happen
                          console.log("Message is too long, do something about it B");
                          if (globalConfig.timeout_if_message_is_long == false) {
                            /*
                            //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            banTwitchUser(roomId, databaseToReadFromResult.user_id, null, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, message too long. [MB MODBOT MB]", new Date().getTime());
                            logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, message too long. [MB MODBOT MB]", new Date().getTime());
                            if (globalConfig.send_messages_to_moderated_user == true) {
                              client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", databaseToReadFromResult.last_message_sent_id);
                            }
                            if (globalConfig.send_whispers_to_moderated_user == true) {
                              sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because your first message is too long, you're either a spam bot, or just came here to spam. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            }
                            if (chatConfig.send_debug_channel_messages == true) {
                              client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, message too long. [MB MODBOT MB]");
                            }
                            */
                            if (globalConfig.warn_if_message_is_long == true) {
                              if (globalConfig.send_messages_to_moderated_user == true) {
                                client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down!", databaseToReadFromResult.last_message_sent_id);
                              }
                            }
                          }
                          if (globalConfig.timeout_if_message_is_long == true) {
                            // For now idk if timeout/delete or not when a message is too long, so I settled for just an in chat warning. It'll obviously happen again and again if the user keeps sending long messages. Not a good way to moderate but it's there just in case.
                            //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            banTwitchUser(roomId, databaseToReadFromResult.user_id, globalConfig.long_message_timeout, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down!", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.long_message_timeout, "You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down!", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, message too long. [MB MODBOT MB]", new Date().getTime());
                            logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.long_message_timeout, "You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down!", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, message too long. [MB MODBOT MB]", new Date().getTime());
                            if (globalConfig.send_messages_to_moderated_user == true) {
                              client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down!", databaseToReadFromResult.last_message_sent_id);
                            }
                            if (globalConfig.send_whispers_to_moderated_user == true) {
                              sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your message is too long, please calm down! This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            }
                            if (chatConfig.send_debug_channel_messages == true) {
                              client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, message too long. [MB MODBOT MB]");
                            }
                          }
                        }
                      }
                    }
                    if (databaseToReadFromResult.is_account_blacklisted == false) {
                      if (databaseToReadFromResult.is_spam_bot == false) {
                        if (databaseToReadFromResult.first_message_sent_id == databaseToReadFromResult.last_message_sent_id) {
                          if (databaseToReadFromResult.first_message_length < globalConfig.long_message_length && doesMessageHaveTooManyUpperCaseLetters == true) {
                            //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            banTwitchUser(roomId, databaseToReadFromResult.user_id, globalConfig.all_caps_message_timeout, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your first message contains too many caps, please calm down!", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.all_caps_message_timeout, "You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your first message contains too many caps, please calm down!", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message contains too many caps. [MB MODBOT MB]", new Date().getTime());
                            logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.all_caps_message_timeout, "You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your first message contains too many caps, please calm down!", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message contains too many caps. [MB MODBOT MB]", new Date().getTime());
                            if (globalConfig.send_messages_to_moderated_user == true) {
                              client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your first message contains too many caps, please calm down!", databaseToReadFromResult.last_message_sent_id);
                            }
                            if (globalConfig.send_whispers_to_moderated_user == true) {
                              sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.all_caps_message_timeout + " seconds because your first message contains too many caps, please calm down! This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            }
                            if (chatConfig.send_debug_channel_messages == true) {
                              client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message contains too many caps. [MB MODBOT MB]");
                            }
                          }
                          if (databaseToReadFromResult.first_message_length >= globalConfig.long_message_length) {
                            // This should never happen
                            //console.log("First message is too long, do something about it C");
                            if (globalConfig.permaban_if_first_message_is_long == true) {
                              //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              banTwitchUser(roomId, databaseToReadFromResult.user_id, null, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, first message too long. [MB MODBOT MB]", new Date().getTime());
                              logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, first message too long. [MB MODBOT MB]", new Date().getTime());
                              if (globalConfig.send_messages_to_moderated_user == true) {
                                client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because your first message is too long, you're either a spam bot, or just came here to spam.", databaseToReadFromResult.last_message_sent_id);
                              }
                              if (globalConfig.send_whispers_to_moderated_user == true) {
                                sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because your first message is too long, you're either a spam bot, or just came here to spam. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                                sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              }
                              if (chatConfig.send_debug_channel_messages == true) {
                                client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, first message too long. [MB MODBOT MB]");
                              }
                            }
                            if (globalConfig.permaban_if_first_message_is_long == false) {
                              //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              banTwitchUser(roomId, databaseToReadFromResult.user_id, globalConfig.long_message_timeout, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your first message is too long, please calm down!", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.long_message_timeout, "You were timed out for " + globalConfig.long_message_timeout + " seconds because your first message is too long, please calm down!", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message too long. [MB MODBOT MB]", new Date().getTime());
                              logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.long_message_timeout, "You were timed out for " + globalConfig.long_message_timeout + " seconds because your first message is too long, please calm down!", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message too long. [MB MODBOT MB]", new Date().getTime());
                              if (globalConfig.send_messages_to_moderated_user == true) {
                                client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your first message is too long, please calm down!", databaseToReadFromResult.last_message_sent_id);
                              }
                              if (globalConfig.send_whispers_to_moderated_user == true) {
                                sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.long_message_timeout + " seconds because your first message is too long, please calm down! This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                                sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              }
                              if (chatConfig.send_debug_channel_messages == true) {
                                client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, first message too long. [MB MODBOT MB]");
                              }
                            }
                          }
                        }
                      }
                    }
                    if (databaseToReadFromResult.is_spam_bot == true) {
                      if (globalConfig.ban_user_again_if_user_is_still_marked_as_spambot == true) {
                        // this should never happen tho lol
                        console.log("BAN THAT MOTHERFUCKER AGAIN");
                        //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        banTwitchUser(roomId, databaseToReadFromResult.user_id, null, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you got detected as spam bot.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because you got detected as spam bot.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, detected as spam bot. [MB MODBOT MB]", new Date().getTime());
                        logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because you got detected as spam bot.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, detected as spam bot. [MB MODBOT MB]", new Date().getTime());
                        if (globalConfig.send_messages_to_moderated_user == true) {
                          client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you got detected as spam bot.", databaseToReadFromResult.last_message_sent_id);
                        }
                        if (globalConfig.send_whispers_to_moderated_user == true) {
                          sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you got detected as spam bot. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ". It is possible your account may have been compromised and is being used to send malicious links to multiple streams.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                          sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        }
                        if (chatConfig.send_debug_channel_messages == true) {
                          client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, detected as spam bot. [MB MODBOT MB]");
                        }
                      }
                    }
                    if (databaseToReadFromResult.is_first_message_spam_bot == true) {
                      if (databaseToReadFromResult.messages_sent >= 3) {
                        if (databaseToReadFromResult.strike_count >= 3) {
                          if (databaseToReadFromResult.ban_count >= 1) {
                            console.log("Yep, that's a multimessage spam bot");
                            //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            banTwitchUser(roomId, databaseToReadFromResult.user_id, null, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you got detected as spam bot.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because you got detected as spam bot.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, detected as spam bot. [MB MODBOT MB]", new Date().getTime());
                            logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because you got detected as spam bot.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, detected as spam bot. [MB MODBOT MB]", new Date().getTime());
                            if (globalConfig.send_messages_to_moderated_user == true) {
                              client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you got detected as spam bot.", databaseToReadFromResult.last_message_sent_id);
                            }
                            if (globalConfig.send_whispers_to_moderated_user == true) {
                              sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you got detected as spam bot. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ". It is possible your account may have been compromised and is being used to send malicious links to multiple streams.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                              sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You sent: " + originalMessage, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                            }
                            if (chatConfig.send_debug_channel_messages == true) {
                              client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, detected as spam bot. [MB MODBOT MB]");
                            }
                          }
                        }
                      }
                      console.log("Keep an eye on this user");
                    }
                    if (slurDetection == true) {
                      if (globalConfig.permaban_when_slur_is_detected == true) {
                        // Tell the user they got banned for sending a slur, and that sending slurs, no matter the context, severity, or how known the user is, will still be an unappealable permanent ban
                        //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        banTwitchUser(roomId, databaseToReadFromResult.user_id, null, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, sent a slur. [MB MODBOT MB]", new Date().getTime());
                        logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "ban", null, "You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, sent a slur. [MB MODBOT MB]", new Date().getTime());
                        if (globalConfig.send_messages_to_moderated_user == true) {
                          client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban.", databaseToReadFromResult.last_message_sent_id);
                        }
                        if (globalConfig.send_whispers_to_moderated_user == true) {
                          sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were banned because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable permanent ban. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        }
                        if (chatConfig.send_debug_channel_messages == true) {
                          client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Banned, sent a slur. [MB MODBOT MB]");
                        }
                      }
                      if (globalConfig.permaban_when_slur_is_detected == false) {
                        // Tell the user they got banned for sending a slur, and that sending slurs, no matter the context, severity, or how known the user is, will still be an unappealable permanent ban
                        //updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        banTwitchUser(roomId, databaseToReadFromResult.user_id, globalConfig.slur_detection_timeout, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        logModbotActionToDatabase(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.slur_detection_timeout, "You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, sent a slur. [MB MODBOT MB]", new Date().getTime());
                        logModbotActionToTextFile(databaseToReadFromResult, roomId, originalMessage, "timeout", globalConfig.slur_detection_timeout, "You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", "You sent: " + originalMessage, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, sent a slur. [MB MODBOT MB]", new Date().getTime());
                        if (globalConfig.send_messages_to_moderated_user == true) {
                          client.reply(target, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout.", databaseToReadFromResult.last_message_sent_id);
                        }
                        if (globalConfig.send_whispers_to_moderated_user == true) {
                          sendTwitchWhisper(databaseToReadFromResult.user_id, "@" + databaseToReadFromResult.last_username_to_ping + " You were timed out for " + globalConfig.slur_detection_timeout + " seconds because you sent a slur. Sending slurs, regardless of context, will always result in an unappealable timeout. This whisper was sent from the channel " + target.replace(/\#+/ig, "") + ".", twitchCredentials, twitchJsonEncodedBotAppAccessToken);
                        }
                        if (chatConfig.send_debug_channel_messages == true) {
                          client.action(chatConfig.debug_channel, new Date().toISOString() + " [MB MODBOT MB] user_id=" + databaseToReadFromResult.user_id + ", last_username_to_ping=" + databaseToReadFromResult.last_username_to_ping + ", last_message_sent_id=" + databaseToReadFromResult.last_message_sent_id + ", last_message_sent=" + databaseToReadFromResult.last_message_sent + ", last_message_sent_at=" + databaseToReadFromResult.last_message_sent_at_iso_timestamp + ", last_message_length=" + databaseToReadFromResult.last_message_length + ", is_first_twitch_message=" + databaseToReadFromResult.is_first_twitch_message + ", is_returning_chatter=" + databaseToReadFromResult.is_returning_chatter + ", is_account_blacklisted=" + databaseToReadFromResult.is_account_blacklisted + ", is_banned=" + databaseToReadFromResult.is_banned + ", is_first_message_spam_bot=" + databaseToReadFromResult.is_first_message_spam_bot + ", is_spam_bot=" + databaseToReadFromResult.is_spam_bot + ", roomId=" + roomId + ", target=" + target + " Timeout, sent a slur. [MB MODBOT MB]");
                        }
                      }
                    }
                  });
                });
                databaseToUpdate.close();
              });
            });
            //
          }
          userDb.close();
          //isDatabaseBusy = false;
        });
      });
    }
    let trustedUsersIndex = chatConfig.trusted_users.findIndex(element => element == userId);
    let channelsToListenIndex = chatConfig.channels_to_listen.findIndex(element => element == roomId);
    if (channelsToListenIndex == -1) {
      //console.log("Don't listen to this channel");
      return;
    }
    channelToSendMessageTo = target;
    usernameToSendMessageTo = usernameToPing;
    messageIdToReplyTo = messageId;
    roomIdToSendMessageTo = roomId;
    if (userId == chatConfig.trusted_users[trustedUsersIndex]) {
      let checkProcessExit = /^[!\"#$%&'()*+,\-./:;%=%?@\[\\\]^_`{|}~¡¦¨«¬­¯°±»½⅔¾⅝⅞∅ⁿ№★†‡‹›¿‰℅æßçñ¹⅓¼⅛²⅜³⁴₱€¢£¥—–·„“”‚‘’•√π÷×¶∆′″§Π♣♠♥♪♦∞≠≈©®™✓‛‟❛❜❝❞❟❠❮❯⹂〝〞〟＂🙶🙷🙸󠀢⍻✅✔𐄂🗸‱]*\s*((res[ty]ar[ty]|reboot)\s*modbot)+/ig.test(originalMessage);
      if (checkProcessExit == true) {
        client.reply(target, "@" + usernameToPing + " " + new Date().toISOString() + " Restarting modbot!", messageId);
        quitApp();
      }
      let checkRebootMachine = /^[!\"#$%&'()*+,\-./:;%=%?@\[\\\]^_`{|}~¡¦¨«¬­¯°±»½⅔¾⅝⅞∅ⁿ№★†‡‹›¿‰℅æßçñ¹⅓¼⅛²⅜³⁴₱€¢£¥—–·„“”‚‘’•√π÷×¶∆′″§Π♣♠♥♪♦∞≠≈©®™✓‛‟❛❜❝❞❟❠❮❯⹂〝〞〟＂🙶🙷🙸󠀢⍻✅✔𐄂🗸‱]*\s*((res[ty]ar[ty]|reboot)\s*mach[io](ne|en))+/ig.test(originalMessage);
      if (checkRebootMachine == true) {
        let operatingSystem = os.platform();
        console.log(new Date().toISOString() + " Attempting to restart machine, the operating system is: " + operatingSystem);
        if (operatingSystem != "win32" && operatingSystem != "linux") {
          // This should hopefully never happen
          console.log(new Date().toISOString() + " The operating system " + operatingSystem + " is UNKNOWN!");
          client.reply(target, "@" + usernameToPing + " " + new Date().toISOString() + " Can't restart " + operatingSystem + " machine, this operating system is UNKNOWN!", messageId);
          return;
        }
        if (operatingSystem == "win32") {
          console.log(new Date().toISOString() + " The operating system " + operatingSystem + " is Windows!");
          client.reply(target, "@" + usernameToPing + " " + new Date().toISOString() + " Restarting " + operatingSystem + " Windows machine!", messageId);
          cmd.get(globalConfig.windows_restart_command, function(err, data, stderr) {
            console.log(data)
          });
        }
        if (operatingSystem == "linux") {
          console.log(new Date().toISOString() + " The operating system " + operatingSystem + " is Linux!");
          client.reply(target, "@" + usernameToPing + " " + new Date().toISOString() + " Restarting " + operatingSystem + " Linux machine!", messageId);
          cmd.get(globalConfig.linux_restart_command, function(err, data, stderr) {
            console.log(data)
          });
        }
      }
      let checkRestartConnection = /^[!\"#$%&'()*+,\-./:;%=%?@\[\\\]^_`{|}~¡¦¨«¬­¯°±»½⅔¾⅝⅞∅ⁿ№★†‡‹›¿‰℅æßçñ¹⅓¼⅛²⅜³⁴₱€¢£¥—–·„“”‚‘’•√π÷×¶∆′″§Π♣♠♥♪♦∞≠≈©®™✓‛‟❛❜❝❞❟❠❮❯⹂〝〞〟＂🙶🙷🙸󠀢⍻✅✔𐄂🗸‱]*\s*((restart)(\s*chat)*\s*connection(\s*status)*)+/ig.test(originalMessage);
      if (checkRestartConnection == true) {
        if (client.readyState() !== "CLOSED") {
          client.reply(target, new Date().toISOString() + " Disconnecting main bot.", messageId);
          console.log("@" + usernameToPing + " " + new Date().toISOString() + " [checkChatConnection E CHAT READY STATES] chatLogger.readyState() = " + chatLogger.readyState() + " client.readyState() = " + client.readyState() + " clientReconnectAttempts = " + clientReconnectAttempts + " chatLoggerReconnectAttempts = " + chatLoggerReconnectAttempts);
          chatConnectionStatus = {
            chat_logger_ready_state: chatLogger.readyState(),
            client_ready_state: client.readyState(),
            client_reconnect_attempts: clientReconnectAttempts,
            chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
            server_start_time: serverStartTime,
            server_current_time: new Date().getTime()
          };
          io.sockets.emit("chat_connection_status", chatConnectionStatus);
          client.disconnect();
          chatConnectionStatus = {
            chat_logger_ready_state: chatLogger.readyState(),
            client_ready_state: client.readyState(),
            client_reconnect_attempts: clientReconnectAttempts,
            chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
            server_start_time: serverStartTime,
            server_current_time: new Date().getTime()
          };
          io.sockets.emit("chat_connection_status", chatConnectionStatus);
          await sleep(500);
          client.connect();
          chatConnectionStatus = {
            chat_logger_ready_state: chatLogger.readyState(),
            client_ready_state: client.readyState(),
            client_reconnect_attempts: clientReconnectAttempts,
            chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
            server_start_time: serverStartTime,
            server_current_time: new Date().getTime()
          };
          io.sockets.emit("chat_connection_status", chatConnectionStatus);
        }
        if (chatLogger.readyState() !== "CLOSED") {
          if (chatConfig.log_chat_as_receiver == true) {
            chatLogger.reply(target, new Date().toISOString() + " Disconnecting chat logger.", messageId);
            console.log("@" + usernameToPing + " " + new Date().toISOString() + " [checkChatConnection F CHAT READY STATES] chatLogger.readyState() = " + chatLogger.readyState() + " client.readyState() = " + client.readyState() + " clientReconnectAttempts = " + clientReconnectAttempts + " chatLoggerReconnectAttempts = " + chatLoggerReconnectAttempts);
            chatConnectionStatus = {
              chat_logger_ready_state: chatLogger.readyState(),
              client_ready_state: client.readyState(),
              client_reconnect_attempts: clientReconnectAttempts,
              chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
              server_start_time: serverStartTime,
              server_current_time: new Date().getTime()
            };
            io.sockets.emit("chat_connection_status", chatConnectionStatus);
            chatLogger.disconnect();
            chatConnectionStatus = {
              chat_logger_ready_state: chatLogger.readyState(),
              client_ready_state: client.readyState(),
              client_reconnect_attempts: clientReconnectAttempts,
              chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
              server_start_time: serverStartTime,
              server_current_time: new Date().getTime()
            };
            io.sockets.emit("chat_connection_status", chatConnectionStatus);
            await sleep(500);
            chatLogger.connect();
            chatConnectionStatus = {
              chat_logger_ready_state: chatLogger.readyState(),
              client_ready_state: client.readyState(),
              client_reconnect_attempts: clientReconnectAttempts,
              chat_logger_reconnect_attempts: chatLoggerReconnectAttempts,
              server_start_time: serverStartTime,
              server_current_time: new Date().getTime()
            };
            io.sockets.emit("chat_connection_status", chatConnectionStatus);
          }
        }
      }
      let checkChatConnectionStatus = /^[!\"#$%&'()*+,\-./:;%=%?@\[\\\]^_`{|}~¡¦¨«¬­¯°±»½⅔¾⅝⅞∅ⁿ№★†‡‹›¿‰℅æßçñ¹⅓¼⅛²⅜³⁴₱€¢£¥—–·„“”‚‘’•√π÷×¶∆′″§Π♣♠♥♪♦∞≠≈©®™✓‛‟❛❜❝❞❟❠❮❯⹂〝〞〟＂🙶🙷🙸󠀢⍻✅✔𐄂🗸‱]*\s*((get|check)\s*chat\s*connection(\s*status)*)+/ig.test(originalMessage);
      if (checkChatConnectionStatus == true) {
        client.reply(target, "@" + usernameToPing + " " + new Date().toISOString() + " [checkChatConnectionStatus CHAT READY STATES] chatLogger.readyState() = " + chatLogger.readyState() + ", client.readyState() = " + client.readyState() + ", clientReconnectAttempts = " + clientReconnectAttempts + ", chatLoggerReconnectAttempts = " + chatLoggerReconnectAttempts, messageId);
      }
    }
    let checkUptime = /^[!\"#$%&'()*+,\-./:;%=%?@\[\\\]^_`{|}~¡¦¨«¬­¯°±»½⅔¾⅝⅞∅ⁿ№★†‡‹›¿‰℅æßçñ¹⅓¼⅛²⅜³⁴₱€¢£¥—–·„“”‚‘’•√π÷×¶∆′″§Π♣♠♥♪♦∞≠≈©®™✓‛‟❛❜❝❞❟❠❮❯⹂〝〞〟＂🙶🙷🙸󠀢⍻✅✔𐄂🗸‱]+\s*(uptim[er]|upti[er]m|up\s*tim[er]|up\s*ti[er]m|tim[er]|ti[er]m)+/ig.test(originalMessage);
    if (checkUptime == true) {
      if (globalConfig.enable_check_uptime == true) {
        let timeOverlayRequestedTwitchStreamStatus = {
          time_server_received_twitch_stream_status_request: new Date().getTime(),
          time_overlay_requested_twitch_stream_status: new Date().getTime()
        };
        timeOverlayRequestedTwitchStreamStatus.overlay_to_server_time_drift_millis = timeOverlayRequestedTwitchStreamStatus.time_server_received_twitch_stream_status_request - timeOverlayRequestedTwitchStreamStatus.time_overlay_requested_twitch_stream_status;
        getTwitchStreamStatus(roomId, userId, usernameToPing, target, messageId, twitchCredentials, twitchJsonEncodedBotAppAccessToken, false, "", timeOverlayRequestedTwitchStreamStatus);
      }
    }
    /*
    let discordPrefixCheck = /^[!\"#$%&'()*+,\-./:;%=%?@\[\\\]^_`{|}~¡¦¨«¬­¯°±»½⅔¾⅝⅞∅ⁿ№★†‡‹›¿‰℅æßçñ¹⅓¼⅛²⅜³⁴₱€¢£¥—–·„“”‚‘’•√π÷×¶∆′″§Π♣♠♥♪♦∞≠≈©®™✓‛‟❛❜❝❞❟❠❮❯⹂〝〞〟＂🙶🙷🙸󠀢⍻✅✔𐄂🗸‱]+\s*(discord)+/ig.test(originalMessage);
    if (discordPrefixCheck == true) {
      updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
      client.reply(target, "@" + usernameToPing + " Discord: " + globalConfig.discord_url, messageId);
    }
    */
    let githubPrefixCheck = /^[!\"#$%&'()*+,\-./:;%=%?@\[\\\]^_`{|}~¡¦¨«¬­¯°±»½⅔¾⅝⅞∅ⁿ№★†‡‹›¿‰℅æßçñ¹⅓¼⅛²⅜³⁴₱€¢£¥—–·„“”‚‘’•√π÷×¶∆′″§Π♣♠♥♪♦∞≠≈©®™✓‛‟❛❜❝❞❟❠❮❯⹂〝〞〟＂🙶🙷🙸󠀢⍻✅✔𐄂🗸‱]+\s*((github)+|((source)+(\s*code)*)+)+/ig.test(message);
    if (githubPrefixCheck == true) {
      client.reply(target, "@" + usernameToPing + " " + globalConfig.github_message + " " + globalConfig.github_repo, messageId);
    }
    /*
    let checkModerators = /^[!\"#$%&'()*+,\-./:;%=%?@\[\\\]^_`{|}~¡¦¨«¬­¯°±»½⅔¾⅝⅞∅ⁿ№★†‡‹›¿‰℅æßçñ¹⅓¼⅛²⅜³⁴₱€¢£¥—–·„“”‚‘’•√π÷×¶∆′″§Π♣♠♥♪♦∞≠≈©®™✓‛‟❛❜❝❞❟❠❮❯⹂〝〞〟＂🙶🙷🙸󠀢⍻✅✔𐄂🗸‱]+\s*((m+o+d+s+)+|(m+o+d+e+r+a+t+o+r+s+))+/ig.test(originalMessage);
    if (checkModerators == true) {
      if (globalConfig.enable_check_moderators == true) {
        console.log("Because Twitch killed the endpoint that I was using to get mods list, this command no longer works. Find another solution that doesn't require you to be the streamer to get the mods list because this makes absolutely no sense.");
      }
    }
    */
    let checkFollowAge = /^[!\"#$%&'()*+,\-./:;%=%?@\[\\\]^_`{|}~¡¦¨«¬­¯°±»½⅔¾⅝⅞∅ⁿ№★†‡‹›¿‰℅æßçñ¹⅓¼⅛²⅜³⁴₱€¢£¥—–·„“”‚‘’•√π÷×¶∆′″§Π♣♠♥♪♦∞≠≈©®™✓‛‟❛❜❝❞❟❠❮❯⹂〝〞〟＂🙶🙷🙸󠀢⍻✅✔𐄂🗸‱]+\s*(f+o+l+o+w+\s*a+g+e+)+/ig.test(originalMessage);
    if (checkFollowAge == true) {
      if (globalConfig.enable_check_followage == true) {
        getTwitchUserFollowingChannelStatus(roomId, userId, usernameToPing, target, messageId, twitchCredentials, twitchJsonEncodedBotAppAccessToken);
      }
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
  console.log(new Date().toISOString() + " Main bot connected to " + addr + ":" + port);
  if (chatConfig.send_debug_channel_messages == true) {
    updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
    client.action(chatConfig.debug_channel, new Date().toISOString() + " Modbot Main bot OK");
  }
}

function onConnectedChatLoggerHandler(addr, port) {
  console.log(new Date().toISOString() + " Chat logger bot connected to " + addr + ":" + port);
  if (chatConfig.send_debug_channel_messages == true) {
    updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
    chatLogger.action(chatConfig.debug_channel, new Date().toISOString() + " Modbot Chat logger bot OK");
  }
}

process.on("SIGINT", onSigInt);

async function quitApp() {
  console.log(new Date().toISOString() + " MODBOT STARTING TO EXIT PROCESS");
  /*
  if (client.readyState() === "OPEN") {
    if (chatConfig.send_debug_channel_messages == true) {
      updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
      client.action(chatConfig.debug_channel, new Date().toISOString() + " MODBOT STARTING TO EXIT PROCESS");
    }
  }
  */
  console.log(new Date().toISOString() + " MODBOT DONE SLEEPING, EXITING PROCESS");
  /*
  if (client.readyState() === "OPEN") {
    if (chatConfig.send_debug_channel_messages == true) {
      updateTwitchUserRandomChatColor(twitchCredentials, twitchJsonEncodedBotAppAccessToken);
      client.action(chatConfig.debug_channel, new Date().toISOString() + " MODBOT DONE SLEEPING, EXITING PROCESS");
    }
  }
  */
  process.exit(0); // 0 will let Node.js know to terminate the process when no async operations are performing. Without mentioning, it will take the default value of 0.
}

async function onSigInt() {
  await quitApp();
}

function logModbotActionToDatabase(originalUserObjectAsReturnedByTheDatabase, roomId, originalMessage, modbotAction, timeoutDuration, modbotReason, modbotResponseToSender, modbotDebugLine, millisTimestamp) {
  if (globalConfig.log_modbot_action_to_database == false) {
    return;
  }
  let dataToAddToDatabase = {
    room_id: roomId,
    original_message: originalMessage,
    modbot_action: modbotAction,
    timeout_duration: timeoutDuration,
    modbot_reason: modbotReason,
    modbot_response_to_sender: modbotResponseToSender,
    modbot_debug_line: modbotDebugLine,
    millis_timestamp: millisTimestamp,
    iso_string_timestamp: new Date(millisTimestamp).toISOString(),
    original_user_object: originalUserObjectAsReturnedByTheDatabase
  };

  mongoClient.connect(mongoUrl, {
    useUnifiedTopology: true
  }, function(err, db) {
    if (err) {
      throw err;
    }
    let dbo = db.db(globalConfig.modbot_moderation_database_name.replace(/({{channel_id}})+/ig, roomId));
    let myobj = dataToAddToDatabase;
    dbo.collection(globalConfig.modbot_moderation_collection_name.replace(/({{channel_id}})+/ig, roomId)).insertOne(myobj, function(err, res) {
      if (err) {
        throw err;
      }
      //console.log("1 document inserted");
      db.close();
    });
  });
}

function logTwitchModerationActionToDatabase(modAction, channel, username, msg, duration, deletedMessage, tags, millisTimestamp) {
  if (globalConfig.log_twitch_moderation_action_to_database == false) {
    return;
  }
  let dataToAddToDatabase = {
    millis_timestamp: millisTimestamp,
    iso_string_timestamp: new Date(millisTimestamp).toISOString(),
    twitch_moderation_action: modAction,
    twitch_channel_name: channel,
    twitch_username: username,
    twitch_msg: msg,
    twitch_timeout_duration: duration,
    twitch_deleted_message: deletedMessage,
    twitch_tags: tags
  };

  if (dataToAddToDatabase.twitch_tags["room-id"] === "" || dataToAddToDatabase.twitch_tags["room-id"] === undefined || dataToAddToDatabase.twitch_tags["room-id"] === null || dataToAddToDatabase.twitch_tags["room-id"] === [] || dataToAddToDatabase.twitch_tags["room-id"] === "[]" || dataToAddToDatabase.twitch_tags["room-id"].toLowerCase() === "null" || dataToAddToDatabase.twitch_tags["room-id"].toLowerCase() === "undefined") {
    dataToAddToDatabase.twitch_tags["room-id"] = "-1";
  }

  mongoClient.connect(mongoUrl, {
    useUnifiedTopology: true
  }, function(err, db) {
    if (err) {
      throw err;
    }
    let dbo = db.db(globalConfig.twitch_moderation_database_name.replace(/({{channel_id}})+/ig, dataToAddToDatabase.twitch_tags["room-id"]));
    let myobj = dataToAddToDatabase;
    dbo.collection(globalConfig.twitch_moderation_collection_name.replace(/({{channel_id}})+/ig, dataToAddToDatabase.twitch_tags["room-id"])).insertOne(myobj, function(err, res) {
      if (err) {
        throw err;
      }
      //console.log("1 document inserted");
      db.close();
    });
  });
}

function logModbotActionToTextFile(originalUserObjectAsReturnedByTheDatabase, roomId, originalMessage, modbotAction, timeoutDuration, modbotReason, modbotResponseToSender, modbotDebugLine, millisTimestamp) {
  if (globalConfig.log_modbot_action_to_text_file == false) {
    return;
  }
  let dataToAddToDatabase = {
    room_id: roomId,
    original_message: originalMessage,
    modbot_action: modbotAction,
    timeout_duration: timeoutDuration,
    modbot_reason: modbotReason,
    modbot_response_to_sender: modbotResponseToSender,
    modbot_debug_line: modbotDebugLine,
    millis_timestamp: millisTimestamp,
    iso_string_timestamp: new Date(millisTimestamp).toISOString(),
    original_user_object: originalUserObjectAsReturnedByTheDatabase
  };
  writeToTextFile("modbot", "modbot_logs", JSON.stringify(dataToAddToDatabase), roomId, millisTimestamp);
}

function logTwitchModerationActionToTextFile(modAction, channel, username, msg, duration, deletedMessage, tags, millisTimestamp) {
  if (globalConfig.log_twitch_moderation_action_to_text_file == false) {
    return;
  }
  let dataToAddToDatabase = {
    millis_timestamp: millisTimestamp,
    iso_string_timestamp: new Date(millisTimestamp).toISOString(),
    twitch_moderation_action: modAction,
    twitch_channel_name: channel,
    twitch_username: username,
    twitch_msg: msg,
    twitch_timeout_duration: duration,
    twitch_deleted_message: deletedMessage,
    twitch_tags: tags
  };

  if (dataToAddToDatabase.twitch_tags["room-id"] === "" || dataToAddToDatabase.twitch_tags["room-id"] === undefined || dataToAddToDatabase.twitch_tags["room-id"] === null || dataToAddToDatabase.twitch_tags["room-id"] === [] || dataToAddToDatabase.twitch_tags["room-id"] === "[]" || dataToAddToDatabase.twitch_tags["room-id"].toLowerCase() === "null" || dataToAddToDatabase.twitch_tags["room-id"].toLowerCase() === "undefined") {
    dataToAddToDatabase.twitch_tags["room-id"] = "-1";
  }
  writeToTextFile("twitch_moderation", "twitch_moderation_logs", JSON.stringify(dataToAddToDatabase), dataToAddToDatabase.twitch_tags["room-id"], millisTimestamp);
}

function writeToTextFile(filenameToWriteTo, folderNameToWriteTo, inputStringToWrite, roomId, millisTimestamp) {
  let textFileMillis = millisTimestamp;
  let textFileTimestamp = new Date(textFileMillis).toISOString();
  let textFileTimestampDate = new Date(textFileMillis).getUTCDate();
  let textFileTimestampMonth = new Date(textFileMillis).getUTCMonth() + 1;
  let textFileTimestampYear = new Date(textFileMillis).getUTCFullYear();
  let chatLogDate = textFileTimestampYear + "-" + textFileTimestampMonth + "-" + textFileTimestampDate;

  let folderToMake = "";
  let textFileFilename = "";

  // Doing this multiple times because I'm using an old version of node that doesn't support recursive folder creation (There was a reason for using this old version but I can't remember what, I think there were compatibility issues with either the serial port module or tmi.js module)
  folderToMake = __dirname + path.sep + folderNameToWriteTo;
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + folderNameToWriteTo);
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + folderNameToWriteTo + path.sep + roomId;
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + roomId);
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + folderNameToWriteTo + path.sep + roomId + path.sep + textFileTimestampYear;
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + textFileTimestampYear);
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + folderNameToWriteTo + path.sep + roomId + path.sep + textFileTimestampYear + path.sep + textFileTimestampMonth;
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + textFileTimestampMonth);
    fs.mkdirSync(folderToMake);
  }
  folderToMake = __dirname + path.sep + folderNameToWriteTo + path.sep + roomId + path.sep + textFileTimestampYear + path.sep + textFileTimestampMonth + path.sep + textFileTimestampDate;
  if (fs.existsSync(folderToMake) == false) {
    console.log(new Date().toISOString() + " [FOLDER CREATION] Creating the folder " + textFileTimestampDate);
    fs.mkdirSync(folderToMake);
  }
  // And then we make the file
  textFileFilename = __dirname + path.sep + folderNameToWriteTo + path.sep + roomId + path.sep + textFileTimestampYear + path.sep + textFileTimestampMonth + path.sep + textFileTimestampDate + path.sep + filenameToWriteTo + "_" + roomId + "_" + textFileTimestampYear + "-" + textFileTimestampMonth + "-" + textFileTimestampDate + ".txt";
  if (fs.existsSync(textFileFilename) == false) {
    console.log(new Date().toISOString() + " [FILE CREATION] Creating the file " + filenameToWriteTo + "_" + roomId + "_" + textFileTimestampYear + "-" + textFileTimestampMonth + "-" + textFileTimestampDate + ".txt");
    fs.writeFileSync(textFileFilename, "", "utf8"); // Create an empty file with UTF-8 Encoding
  }
  // Then we append to the file
  textFileFilename = __dirname + path.sep + folderNameToWriteTo + path.sep + roomId + path.sep + textFileTimestampYear + path.sep + textFileTimestampMonth + path.sep + textFileTimestampDate + path.sep + filenameToWriteTo + "_" + roomId + "_" + textFileTimestampYear + "-" + textFileTimestampMonth + "-" + textFileTimestampDate + ".txt";
  if (fs.existsSync(textFileFilename) == true) {
    //console.log(new Date().toISOString() + " [FILE WRITING] Append to the file");
    fs.appendFileSync(textFileFilename, textFileTimestamp + " " + inputStringToWrite + "\n", "utf8");
  }
}