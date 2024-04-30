var fontTable = [{
    "font_name": "5x5.ttf", // Not mono, has arrows, has <^>v- for arrow replacement, has special quotation marks, has normal quotation marks, has apostrophe, is slightly blurry when it comes to numbers
    "font_default_size": 10,
    "font_default_leading": 6,
    "font_stroke_leading": 8
  },
  {
    "font_name": "5x5_pixel.ttf", // Only has letters and numbers, nothing else, not mono, no arrows, doesn't have <^>v- for arrow replacement, doesn't have special quotation marks, doesn't have normal quotation marks, doesn't have apostrophe
    "font_default_size": 8,
    "font_default_leading": 6,
    "font_stroke_leading": 8
  },
  {
    "font_name": "Berkelium64.ttf", // Not mono, no arrows, has <^>v- for arrow replacement, has special quotation marks, has normal quotation marks, has apostrophe
    "font_default_size": 10,
    "font_default_leading": 10,
    "font_stroke_leading": 12
  },
  {
    "font_name": "Berkelium1541.ttf", // Not mono, no arrows, has <^>v- for arrow replacement, has special quotation marks, has normal quotation marks, has apostrophe
    "font_default_size": 6,
    "font_default_leading": 7,
    "font_stroke_leading": 9
  },
  {
    "font_name": "CG_pixel_3x5.ttf", // Numbers are mono, no arrows, has <^>v- for arrow replacement, doesn't have special quotation marks, has normal quotation marks, has apostrophe, slightly blurry at certain points, but way less blurrier than 5x5.ttf
    "font_default_size": 5,
    "font_default_leading": 6,
    "font_stroke_leading": 8
  },
  {
    "font_name": "CG_pixel_3x5_mono.ttf", // No arrows, has <^>v- for arrow replacement, doesn't have special quotation marks, has normal quotation marks, has apostrophe
    "font_default_size": 5,
    "font_default_leading": 6,
    "font_stroke_leading": 8
  },
  {
    "font_name": "CG_pixel_4x5.ttf", // Numbers are mono, no arrows, has <^>v- for arrow replacement, doesn't have special quotation marks, has normal quotation marks, has apostrophe
    "font_default_size": 5,
    "font_default_leading": 6,
    "font_stroke_leading": 8
  },
  {
    "font_name": "CG_pixel_4x5_mono.ttf", // No arrows, has <^>v- for arrow replacement, doesn't have special quotation marks, has normal quotation marks, has apostrophe
    "font_default_size": 5,
    "font_default_leading": 6,
    "font_stroke_leading": 8
  },
  {
    "font_name": "Pokemon_DPPt_mod2.ttf", // Has special characters for thicker arrows, doesn't have <^>v- for arrow replacement, has special quotation marks, doesn't have normal quotation marks, doesn't have apostrophe
    "font_default_size": 16,
    "font_default_leading": 12,
    "font_stroke_leading": 14
  },
  {
    "font_name": "TLOZ-Phantom-Hourglass.ttf", // This font is odd, it doesn't quite line up but 16 is indeed the right size, not quite pixel perfect but almost, not mono, no arrows, has <^>v- for arrow replacement, has special quotation marks, has normal quotation marks that look like special quotation marks, has apostrophe that looks like special apostrophe
    "font_default_size": 16,
    "font_default_leading": 14,
    "font_stroke_leading": 16
  },
  {
    "font_name": "VCR_OSD_MONO.ttf", // Not pixel perfect at all????, has arrows, has <^>v- for arrow replacement, has special quotation marks, has normal quotation marks, has apostrophe
    "font_default_size": 20,
    "font_default_leading": 17,
    "font_stroke_leading": 19
  },
  {
    "font_name": "VCR_OSD_MONO_1.001.ttf", // Not pixel perfect at all????, is this the same as the font above?, has arrows, has <^>v- for arrow replacement, has special quotation marks, has normal quotation marks, has apostrophe
    "font_default_size": 20,
    "font_default_leading": 17,
    "font_stroke_leading": 19
  },
  {
    "font_name": "VCREAS_3.0.ttf", // A lot sharper than the fonts above, but still kinda blurry?, no arrows, has arrows, has <^>v- for arrow replacement, doesn't have special quotation marks, has normal quotation marks, has apostrophe
    "font_default_size": 20,
    "font_default_leading": 17,
    "font_stroke_leading": 19
  }
];

var fontToUse = "VCREAS_3.0.ttf";
var fontNameIndex = fontTable.findIndex(element => element.font_name == fontToUse);
var fontName = fontTable[fontNameIndex].font_name;
var fontDefaultSize = fontTable[fontNameIndex].font_default_size;
var fontDefaultLeading = fontTable[fontNameIndex].font_default_leading;
var fontStrokeLeading = fontTable[fontNameIndex].font_stroke_leading;
var differenceBetweenDefaultAndStrokeLeadingDistances = fontStrokeLeading - fontDefaultLeading; // Should always be 2 for pixel perfect fonts, but this is here in case it isn't
var fontSizeMultiplier = 3;
var fontStrokeWeightMultiplier = 1;
var fontStrokeWeight = 2 * fontStrokeWeightMultiplier; // Has to be 2 because 1 is transparent????, so only use even numbers
var fontDefaultLeading1px = fontSizeMultiplier - 1; // -1 because we want to make it one pixel closer
var fontStrokeLeading1px = (fontSizeMultiplier) * (differenceBetweenDefaultAndStrokeLeadingDistances + 1) - (differenceBetweenDefaultAndStrokeLeadingDistances + 1); // +1 because one extra pixel needed // Need to figure out how to have constant 1px regardless of strokeweight
var textSizeToUse = fontDefaultSize * fontSizeMultiplier;
var textDefaultLeadingToUse = ((fontDefaultLeading * fontSizeMultiplier) - fontDefaultLeading1px) + fontStrokeWeight;
var textStrokeLeadingToUse = ((fontStrokeLeading * fontSizeMultiplier) - fontStrokeLeading1px) + fontStrokeWeight;

var queryFound = false;
var queryToUse = {};
var streamStatus = {
  stream_status_started_at: "",
  stream_status_started_at_millis: 0,
  stream_status_viewer_count: 0,
  twitch_api_status_code: -1,
  time_uptime_was_requested: 0,
  uptime_total: 0,
  server_start_time: 0,
  server_start_time_string: "",
  is_stream_live: false,
  uptime_string: "",
  stream_status_delta_uptime: 0,
  stream_status_uptime_string: "",
  twitch_channel_status_raw_response: {}
};

var loadingStringsChosenToBeRandomizedByRaritySystem = {
  loading_strings: [
    {
      loading_strings_pack_name: "PLACEHOLDER",
      loading_string: "PLACEHOLDER",
      loading_string_rarity: 0 
    }
  ]
};

var loadingStringsConfig = {
  rarity_minimum: 0,
  rarity_maximum: 65535,
  rarity_system_enabled: false,
  rarity_observations: "minimum is the floor of the integer to be randomized, maximum is the ceiling of the integer to be randomized, the lower the rarity number of a string, the more commom it is, the higher it gets, the rarer it is.",
  loading_strings: [
    {
      loading_strings_pack_name: "PLACEHOLDER",
      loading_strings_pack: [
        {
          loading_string: "PLACEHOLDER",
          loading_string_rarity: 0
        }
      ]
    }
  ]
};

var loadingStringToBeDisplayed = {
  loading_strings_pack_name: "PLACEHOLDER",
  loading_string: "PLACEHOLDER",
  loading_string_rarity: 0
};

var loadingStringsPackIndex = 0;
var loadingStringsIndex = 0;
if (loadingStringsConfig.rarity_system_enabled == false) {
  loadingStringsPackIndex = Math.floor(Math.random() * loadingStringsConfig.loading_strings.length);
  loadingStringsIndex = Math.floor(Math.random() * loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack.length);
  //console.log("ONINITIALLOAD loadingStringsPackIndex = " + loadingStringsPackIndex + " , loadingStringsIndex = " + loadingStringsIndex + " loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack_name = " + loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack_name + " loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack[loadingStringsIndex].loading_string = " + loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack[loadingStringsIndex].loading_string);
  loadingStringToBeDisplayed = {
    loading_strings_pack_name: loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack_name,
    loading_string: loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack[loadingStringsIndex].loading_string,
    loading_string_rarity: loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack[loadingStringsIndex].loading_string_rarity
  };
}
var randomRarityIntegerToPick = 0;
if (loadingStringsConfig.rarity_system_enabled == true) {
  loadingStringsChosenToBeRandomizedByRaritySystem = {
    loading_strings: [
    ]
  };
  randomRarityIntegerToPick = getRandomIntInclusive(loadingStringsConfig.rarity_minimum, loadingStringsConfig.rarity_maximum);
  //console.log("randomRarityIntegerToPick = " + randomRarityIntegerToPick);
  for (let loadingStringsPackIndexLoop = 0; loadingStringsPackIndexLoop < loadingStringsConfig.loading_strings.length; loadingStringsPackIndexLoop++) {
    for (let loadingStringsIndexLoop = 0; loadingStringsIndexLoop < loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack.length; loadingStringsIndexLoop++) {
      if (loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack[loadingStringsIndexLoop].loading_string_rarity <= randomRarityIntegerToPick) {
        var dataToAddToLoadingStringsChosenToBeRandomizedByRaritySystem = {
          loading_strings_pack_name: loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack_name,
          loading_string: loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack[loadingStringsIndexLoop].loading_string,
          loading_string_rarity: loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack[loadingStringsIndexLoop].loading_string_rarity
        };
        loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings.push(dataToAddToLoadingStringsChosenToBeRandomizedByRaritySystem);
        //console.log(dataToAddToLoadingStringsChosenToBeRandomizedByRaritySystem);
      }
    }
  }
  var loadingStringChosenByRaritySystem = Math.floor(Math.random() * loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings.length);
  loadingStringToBeDisplayed = {
    loading_strings_pack_name: loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings[loadingStringChosenByRaritySystem].loading_strings_pack_name,
    loading_string: loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings[loadingStringChosenByRaritySystem].loading_string,
    loading_string_rarity: loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings[loadingStringChosenByRaritySystem].loading_string_rarity
  };
}

var isAnyRequestedTwitchDataValid = false;
var isDisplayViewerCountValid = false;
var isDisplayTwitchUptimeStreamValid = false;

// Below are variables related to viewer count
var viewerCountXPosQueryIndex = -1;
var viewerCountYPosQueryIndex = -1;
var viewerCountXPos = 0;
var viewerCountYPos = 0;

var viewerCountFontSizeQueryIndex = -1;
var viewerCountFontSize = 0;

var viewerCountFontSizeUseMultiplierQueryIndex = -1;
var viewerCountFontSizeUseMultiplier = false;

var viewerCountFontStrokeWeightQueryIndex = -1;
var viewerCountFontStrokeWeight = 0;

var viewerCountFontStrokeWeightUseMultiplierQueryIndex = -1;
var viewerCountFontStrokeWeightUseMultiplier = false;

var viewerCountFontLeadingQueryIndex = -1;
var viewerCountFontLeading = 0;

var viewerCountFontLeadingUseMultiplierQueryIndex = -1;
var viewerCountFontLeadingUseMultiplier = false;

var viewerCountFontAlignRightQueryIndex = -1;
var viewerCountFontAlignRight = false;

var viewerCountFontAlignCenterQueryIndex = -1;
var viewerCountFontAlignCenter = false;

var viewerCountFontAlignBottomQueryIndex = -1;
var viewerCountFontAlignBottom = false;

// Below are variables related to stream uptime
var twitchStreamUptimeXPosQueryIndex = -1;
var twitchStreamUptimeYPosQueryIndex = -1;
var twitchStreamUptimeXPos = 0;
var twitchStreamUptimeYPos = 0;

var twitchStreamUptimeFontSizeQueryIndex = -1;
var twitchStreamUptimeFontSize = 0;

var twitchStreamUptimeFontSizeUseMultiplierQueryIndex = -1;
var twitchStreamUptimeFontSizeUseMultiplier = false;

var twitchStreamUptimeFontStrokeWeightQueryIndex = -1;
var twitchStreamUptimeFontStrokeWeight = 0;

var twitchStreamUptimeFontStrokeWeightUseMultiplierQueryIndex = -1;
var twitchStreamUptimeFontStrokeWeightUseMultiplier = false;

var twitchStreamUptimeFontLeadingQueryIndex = -1;
var twitchStreamUptimeFontLeading = 0;

var twitchStreamUptimeFontLeadingUseMultiplierQueryIndex = -1;
var twitchStreamUptimeFontLeadingUseMultiplier = false;

var twitchStreamUptimeFontAlignRightQueryIndex = -1;
var twitchStreamUptimeFontAlignRight = false;

var twitchStreamUptimeFontAlignCenterQueryIndex = -1;
var twitchStreamUptimeFontAlignCenter = false;

var twitchStreamUptimeFontAlignBottomQueryIndex = -1;
var twitchStreamUptimeFontAlignBottom = false;

// Below are variables related to current time
var displayCurrentTimeQueryIndex = -1;
var displayCurrentTime = false;

var currentTimeXPosQueryIndex = -1;
var currentTimeYPosQueryIndex = -1;
var currentTimeXPos = 0;
var currentTimeYPos = 0;

var currentTimeFontSizeQueryIndex = -1;
var currentTimeFontSize = 0;

var currentTimeFontSizeUseMultiplierQueryIndex = -1;
var currentTimeFontSizeUseMultiplier = false;

var currentTimeFontStrokeWeightQueryIndex = -1;
var currentTimeFontStrokeWeight = 0;

var currentTimeFontStrokeWeightUseMultiplierQueryIndex = -1;
var currentTimeFontStrokeWeightUseMultiplier = false;

var currentTimeFontLeadingQueryIndex = -1;
var currentTimeFontLeading = 0;

var currentTimeFontLeadingUseMultiplierQueryIndex = -1;
var currentTimeFontLeadingUseMultiplier = false;

var currentTimeFontAlignRightQueryIndex = -1;
var currentTimeFontAlignRight = false;

var currentTimeFontAlignCenterQueryIndex = -1;
var currentTimeFontAlignCenter = false;

var currentTimeFontAlignBottomQueryIndex = -1;
var currentTimeFontAlignBottom = false;

// Below are variables related to loading strings
var displayLoadingStringsQueryIndex = -1;
var displayLoadingStrings = false;

var loadingStringsXPosQueryIndex = -1;
var loadingStringsYPosQueryIndex = -1;
var loadingStringsXPos = 0;
var loadingStringsYPos = 0;

var loadingStringsFontSizeQueryIndex = -1;
var loadingStringsFontSize = 0;

var loadingStringsFontSizeUseMultiplierQueryIndex = -1;
var loadingStringsFontSizeUseMultiplier = false;

var loadingStringsFontStrokeWeightQueryIndex = -1;
var loadingStringsFontStrokeWeight = 0;

var loadingStringsFontStrokeWeightUseMultiplierQueryIndex = -1;
var loadingStringsFontStrokeWeightUseMultiplier = false;

var loadingStringsFontLeadingQueryIndex = -1;
var loadingStringsFontLeading = 0;

var loadingStringsFontLeadingUseMultiplierQueryIndex = -1;
var loadingStringsFontLeadingUseMultiplier = false;

var loadingStringsFontAlignRightQueryIndex = -1;
var loadingStringsFontAlignRight = false;

var loadingStringsFontAlignCenterQueryIndex = -1;
var loadingStringsFontAlignCenter = false;

var loadingStringsFontAlignBottomQueryIndex = -1;
var loadingStringsFontAlignBottom = false;

var dataToDisplay = [
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
    query_value: 1915,
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

var validQueryDataFound = false;

var secondCurrent = 0;
var secondOld = 0;

var font;
var socket;
var sound;

var audioStatusGlobal = false;

function preload() {
  font = loadFont(fontName);
  sound = loadSound("placeholder.mp3");
}

function recalculateFont(newFontSizeMultiplier, newFontStrokeWeightMultiplier) { // Add these multipliers to the queries? (and override size with multipler or mul;tipler with size?)
  differenceBetweenDefaultAndStrokeLeadingDistances = fontStrokeLeading - fontDefaultLeading; // Should always be 2 for pixel perfect fonts, but this is here in case it isn't
  fontSizeMultiplier = newFontSizeMultiplier;
  fontStrokeWeightMultiplier = newFontStrokeWeightMultiplier;
  fontStrokeWeight = 2 * fontStrokeWeightMultiplier; // Has to be 2 because 1 is transparent????, so only use even numbers
  fontDefaultLeading1px = fontSizeMultiplier - 1; // -1 because we want to make it one pixel closer
  fontStrokeLeading1px = (fontSizeMultiplier) * (differenceBetweenDefaultAndStrokeLeadingDistances + 1) - (differenceBetweenDefaultAndStrokeLeadingDistances + 1); // +1 because one extra pixel needed // Need to figure out how to have constant 1px regardless of strokeweight
  textSizeToUse = fontDefaultSize * fontSizeMultiplier;
  textDefaultLeadingToUse = ((fontDefaultLeading * fontSizeMultiplier) - fontDefaultLeading1px) + fontStrokeWeight;
  textStrokeLeadingToUse = ((fontStrokeLeading * fontSizeMultiplier) - fontStrokeLeading1px) + fontStrokeWeight;
}

function setup() {
  viewerCountFontAlignRight = LEFT;
  viewerCountFontAlignCenter = LEFT;
  viewerCountFontAlignBottom = TOP;

  twitchStreamUptimeFontAlignRight = LEFT;
  twitchStreamUptimeFontAlignCenter = LEFT;
  twitchStreamUptimeFontAlignBottom = TOP;

  currentTimeFontAlignRight = LEFT;
  currentTimeFontAlignCenter = LEFT;
  currentTimeFontAlignBottom = TOP;

  loadingStringsFontAlignRight = LEFT;
  loadingStringsFontAlignCenter = LEFT;
  loadingStringsFontAlignBottom = TOP;

  noSmooth();
  frameRate(60);
  createCanvas(1920, 1080);
  background("#00000000");
  socket = io.connect();

  socket.on("query_found", function(data) {
    queryFound = data;
    //console.log("queryFound");
    //console.log(queryFound);
  });

  socket.on("valid_query_data_found", function(data) {
    validQueryDataFound = data;
    //console.log("validQueryDataFound");
    //console.log(validQueryDataFound);
  });

  socket.on("query_to_use", function(data) {
    queryToUse = data;
    //console.log("queryToUse");
    //console.log(queryToUse);
  });

  socket.on("data_to_display", function(data) {
    dataToDisplay = data;
    //console.log("dataToDisplay");
    //console.log(dataToDisplay);
    //let channelIdToUse = dataToDisplay.findIndex(element => element.query_name == "channel_id".toLowerCase());
    //let queryNameIndex = lowerCaseQueryKeys.findIndex(element => element == dataToDisplay[dataToDisplayIndex].query_name.toLowerCase());
    //console.log(channelIdToUse);
    //console.log(dataToDisplay[channelIdToUse]);
    let audioNameIndex = dataToDisplay.findIndex(element => element.query_name == "audio_name".toLowerCase());
    if (audioNameIndex >= 0) {
      if (dataToDisplay[audioNameIndex].is_valid == false) {
        // Use default_value here
      }
      if (dataToDisplay[audioNameIndex].is_valid == true) {
        // Use query_value here
        //console.log(dataToDisplay[audioNameIndex].query_value);
        //sound.stop();
        //sound.setLoop(false);
        //sound = loadSound(dataToDisplay[audioNameIndex].query_value);
      }
    }
  });

  socket.on("audio_name", function(data) {
    //console.log("audio_name");
    //console.log(data);
    sound.stop();
    sound.setLoop(false);
    sound = loadSound(data);
  });

  socket.on("loop_audio", function(data) {
    //console.log("loop_audio");
    //console.log(data);
    sound.setLoop(data);
  });

  setInterval(playAudio, 100, false);

  socket.on("play_audio", function(data) {
    //console.log("play_audio");
    //console.log(data);
    audioStatusGlobal = data;
    /*
    while (sound.isLoaded() == false) {
      console.log(new Date().toISOString() + " File Loading???");
    }
    */
    if (sound.isLoaded() == false) {
      //console.log(new Date().toISOString() + " File loading, please wait...");
      //setInterval(playAudio, 100, data);
    }
    if (sound.isLoaded() == true) {
      //console.log(new Date().toISOString() + " File loaded successfully!");
      //sound.play();
    }
  });

  socket.on("pause_audio", function(data) {
    //console.log("pause_audio");
    //console.log(data);
    sound.pause();
  });

  socket.on("stop_audio", function(data) {
    //console.log("stop_audio");
    //console.log(data);
    sound.stop();
  });

  socket.on("stream_status", function(data) {
    streamStatus = data;
    //console.log("streamStatus");
    //console.log(streamStatus);
  });
  socket.on("loading_strings", function(data) {
    loadingStringsConfig = data;
    //console.log("loadingStringsConfig");
    //console.log(loadingStringsConfig);
    loadingStringsPackIndex = 0;
    loadingStringsIndex = 0;
    if (loadingStringsConfig.rarity_system_enabled == false) {
      loadingStringsPackIndex = Math.floor(Math.random() * loadingStringsConfig.loading_strings.length);
      loadingStringsIndex = Math.floor(Math.random() * loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack.length);
      //console.log("ONCONNECT loadingStringsPackIndex = " + loadingStringsPackIndex + " , loadingStringsIndex = " + loadingStringsIndex + " loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack_name = " + loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack_name + " loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack[loadingStringsIndex].loading_string = " + loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack[loadingStringsIndex].loading_string);
      loadingStringToBeDisplayed = {
        loading_strings_pack_name: loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack_name,
        loading_string: loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack[loadingStringsIndex].loading_string,
        loading_string_rarity: loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack[loadingStringsIndex].loading_string_rarity
      };
    }
    randomRarityIntegerToPick = 0;
    if (loadingStringsConfig.rarity_system_enabled == true) {
      loadingStringsChosenToBeRandomizedByRaritySystem = {
        loading_strings: [
        ]
      };
      randomRarityIntegerToPick = getRandomIntInclusive(loadingStringsConfig.rarity_minimum, loadingStringsConfig.rarity_maximum);
      //console.log("randomRarityIntegerToPick = " + randomRarityIntegerToPick);
      for (let loadingStringsPackIndexLoop = 0; loadingStringsPackIndexLoop < loadingStringsConfig.loading_strings.length; loadingStringsPackIndexLoop++) {
        for (let loadingStringsIndexLoop = 0; loadingStringsIndexLoop < loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack.length; loadingStringsIndexLoop++) {
          if (loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack[loadingStringsIndexLoop].loading_string_rarity <= randomRarityIntegerToPick) {
            let dataToAddToLoadingStringsChosenToBeRandomizedByRaritySystem = {
              loading_strings_pack_name: loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack_name,
              loading_string: loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack[loadingStringsIndexLoop].loading_string,
              loading_string_rarity: loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack[loadingStringsIndexLoop].loading_string_rarity
            };
            loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings.push(dataToAddToLoadingStringsChosenToBeRandomizedByRaritySystem);
            //console.log(dataToAddToLoadingStringsChosenToBeRandomizedByRaritySystem);
          }
        }
      }
      let loadingStringChosenByRaritySystem = Math.floor(Math.random() * loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings.length);
      loadingStringToBeDisplayed = {
        loading_strings_pack_name: loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings[loadingStringChosenByRaritySystem].loading_strings_pack_name,
        loading_string: loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings[loadingStringChosenByRaritySystem].loading_string,
        loading_string_rarity: loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings[loadingStringChosenByRaritySystem].loading_string_rarity
      };
    }
  });
}

function draw() {
  clear();
  background("#00000000");
  secondCurrent = new Date().getUTCSeconds();
  if (secondCurrent != secondOld) {
    if (secondCurrent % 3 == 0) {
      // Change loading strings here (is every 3 seconds good?)
      //console.log("Multiple Of 3");
      //console.log("secondCurrent = " + secondCurrent + " and secondOld = " + secondOld);
      if (loadingStringsConfig.rarity_system_enabled == false) {
        loadingStringsPackIndex = Math.floor(Math.random() * loadingStringsConfig.loading_strings.length);
        loadingStringsIndex = Math.floor(Math.random() * loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack.length);
        //console.log("ONTIME loadingStringsPackIndex = " + loadingStringsPackIndex + " , loadingStringsIndex = " + loadingStringsIndex + " loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack_name = " + loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack_name + " loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack[loadingStringsIndex].loading_string = " + loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack[loadingStringsIndex].loading_string);
        loadingStringToBeDisplayed = {
          loading_strings_pack_name: loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack_name,
          loading_string: loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack[loadingStringsIndex].loading_string,
          loading_string_rarity: loadingStringsConfig.loading_strings[loadingStringsPackIndex].loading_strings_pack[loadingStringsIndex].loading_string_rarity
        };
      }
      randomRarityIntegerToPick = 0;
      if (loadingStringsConfig.rarity_system_enabled == true) {
        loadingStringsChosenToBeRandomizedByRaritySystem = {
          loading_strings: [
          ]
        };
        randomRarityIntegerToPick = getRandomIntInclusive(loadingStringsConfig.rarity_minimum, loadingStringsConfig.rarity_maximum);
        //console.log("randomRarityIntegerToPick = " + randomRarityIntegerToPick);
        for (let loadingStringsPackIndexLoop = 0; loadingStringsPackIndexLoop < loadingStringsConfig.loading_strings.length; loadingStringsPackIndexLoop++) {
          for (let loadingStringsIndexLoop = 0; loadingStringsIndexLoop < loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack.length; loadingStringsIndexLoop++) {
            if (loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack[loadingStringsIndexLoop].loading_string_rarity <= randomRarityIntegerToPick) {
              let dataToAddToLoadingStringsChosenToBeRandomizedByRaritySystem = {
                loading_strings_pack_name: loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack_name,
                loading_string: loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack[loadingStringsIndexLoop].loading_string,
                loading_string_rarity: loadingStringsConfig.loading_strings[loadingStringsPackIndexLoop].loading_strings_pack[loadingStringsIndexLoop].loading_string_rarity
              };
              loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings.push(dataToAddToLoadingStringsChosenToBeRandomizedByRaritySystem);
              //console.log(dataToAddToLoadingStringsChosenToBeRandomizedByRaritySystem);
            }
          }
        }
        let loadingStringChosenByRaritySystem = Math.floor(Math.random() * loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings.length);
        loadingStringToBeDisplayed = {
          loading_strings_pack_name: loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings[loadingStringChosenByRaritySystem].loading_strings_pack_name,
          loading_string: loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings[loadingStringChosenByRaritySystem].loading_string,
          loading_string_rarity: loadingStringsChosenToBeRandomizedByRaritySystem.loading_strings[loadingStringChosenByRaritySystem].loading_string_rarity
        };
      }
    }
  }
  if (socket.connected == true) {
    if (secondCurrent != secondOld) {
      if (secondCurrent % 5 == 0) {
        // Request viewer count and other data here (is every 5 seconds good?)
        requestTwitchStreamStatus(); // Make overlay not display twitch related stuff and other stuff idk when client is not connected to the server
      }
    }
    if (isAnyRequestedTwitchDataValid == true) {

      // Below are processing steps related to viewer count
      viewerCountXPosQueryIndex = dataToDisplay.findIndex(element => element.query_name == "viewer_count_xpos".toLowerCase());
      viewerCountYPosQueryIndex = dataToDisplay.findIndex(element => element.query_name == "viewer_count_ypos".toLowerCase());
      if (viewerCountXPosQueryIndex >= 0) {
        if (dataToDisplay[viewerCountXPosQueryIndex].is_valid == false) {
          // Use default_value here
          viewerCountXPos = dataToDisplay[viewerCountXPosQueryIndex].default_value;
        }
        if (dataToDisplay[viewerCountXPosQueryIndex].is_valid == true) {
          // Use query_value here
          viewerCountXPos = dataToDisplay[viewerCountXPosQueryIndex].query_value;
        }
      }
      if (viewerCountYPosQueryIndex >= 0) {
        if (dataToDisplay[viewerCountYPosQueryIndex].is_valid == false) {
          // Use default_value here
          viewerCountYPos = dataToDisplay[viewerCountYPosQueryIndex].default_value;
        }
        if (dataToDisplay[viewerCountYPosQueryIndex].is_valid == true) {
          // Use query_value here
          viewerCountYPos = dataToDisplay[viewerCountYPosQueryIndex].query_value;
        }
      }

      viewerCountFontSizeQueryIndex = dataToDisplay.findIndex(element => element.query_name == "viewer_count_font_size".toLowerCase());
      if (viewerCountFontSizeQueryIndex >= 0) {
        if (dataToDisplay[viewerCountFontSizeQueryIndex].is_valid == false) {
          // Use default_value here
          viewerCountFontSize = dataToDisplay[viewerCountFontSizeQueryIndex].default_value;
        }
        if (dataToDisplay[viewerCountFontSizeQueryIndex].is_valid == true) {
          // Use query_value here
          viewerCountFontSize = dataToDisplay[viewerCountFontSizeQueryIndex].query_value;
        }
      }

      viewerCountFontSizeUseMultiplierQueryIndex = dataToDisplay.findIndex(element => element.query_name == "viewer_count_font_size_use_multiplier".toLowerCase());
      if (viewerCountFontSizeUseMultiplierQueryIndex >= 0) {
        if (dataToDisplay[viewerCountFontSizeUseMultiplierQueryIndex].is_valid == false) {
          // Use default_value here
          viewerCountFontSizeUseMultiplier = dataToDisplay[viewerCountFontSizeUseMultiplierQueryIndex].default_value;
        }
        if (dataToDisplay[viewerCountFontSizeUseMultiplierQueryIndex].is_valid == true) {
          // Use query_value here
          viewerCountFontSizeUseMultiplier = dataToDisplay[viewerCountFontSizeUseMultiplierQueryIndex].query_value;
        }
      }

      viewerCountFontStrokeWeightQueryIndex = dataToDisplay.findIndex(element => element.query_name == "viewer_count_font_stroke_weight".toLowerCase());
      if (viewerCountFontStrokeWeightQueryIndex >= 0) {
        if (dataToDisplay[viewerCountFontStrokeWeightQueryIndex].is_valid == false) {
          // Use default_value here
          viewerCountFontStrokeWeight = dataToDisplay[viewerCountFontStrokeWeightQueryIndex].default_value;
        }
        if (dataToDisplay[viewerCountFontStrokeWeightQueryIndex].is_valid == true) {
          // Use query_value here
          viewerCountFontStrokeWeight = dataToDisplay[viewerCountFontStrokeWeightQueryIndex].query_value;
        }
      }

      viewerCountFontStrokeWeightUseMultiplierQueryIndex = dataToDisplay.findIndex(element => element.query_name == "viewer_count_font_stroke_weight_use_multiplier".toLowerCase());
      if (viewerCountFontStrokeWeightUseMultiplierQueryIndex >= 0) {
        if (dataToDisplay[viewerCountFontStrokeWeightUseMultiplierQueryIndex].is_valid == false) {
          // Use default_value here
          viewerCountFontStrokeWeightUseMultiplier = dataToDisplay[viewerCountFontStrokeWeightUseMultiplierQueryIndex].default_value;
        }
        if (dataToDisplay[viewerCountFontStrokeWeightUseMultiplierQueryIndex].is_valid == true) {
          // Use query_value here
          viewerCountFontStrokeWeightUseMultiplier = dataToDisplay[viewerCountFontStrokeWeightUseMultiplierQueryIndex].query_value;
        }
      }

      viewerCountFontLeadingQueryIndex = dataToDisplay.findIndex(element => element.query_name == "viewer_count_font_leading".toLowerCase());
      if (viewerCountFontLeadingQueryIndex >= 0) {
        if (dataToDisplay[viewerCountFontLeadingQueryIndex].is_valid == false) {
          // Use default_value here
          viewerCountFontLeading = dataToDisplay[viewerCountFontLeadingQueryIndex].default_value;
        }
        if (dataToDisplay[viewerCountFontLeadingQueryIndex].is_valid == true) {
          // Use query_value here
          viewerCountFontLeading = dataToDisplay[viewerCountFontLeadingQueryIndex].query_value;
        }
      }

      viewerCountFontLeadingUseMultiplierQueryIndex = dataToDisplay.findIndex(element => element.query_name == "viewer_count_font_leading_use_multiplier".toLowerCase());
      if (viewerCountFontLeadingUseMultiplierQueryIndex >= 0) {
        if (dataToDisplay[viewerCountFontLeadingUseMultiplierQueryIndex].is_valid == false) {
          // Use default_value here
          viewerCountFontLeadingUseMultiplier = dataToDisplay[viewerCountFontLeadingUseMultiplierQueryIndex].default_value;
        }
        if (dataToDisplay[viewerCountFontLeadingUseMultiplierQueryIndex].is_valid == true) {
          // Use query_value here
          viewerCountFontLeadingUseMultiplier = dataToDisplay[viewerCountFontLeadingUseMultiplierQueryIndex].query_value;
        }
      }

      viewerCountFontAlignRightQueryIndex = dataToDisplay.findIndex(element => element.query_name == "viewer_count_font_align_right".toLowerCase());
      viewerCountFontAlignCenterQueryIndex = dataToDisplay.findIndex(element => element.query_name == "viewer_count_font_align_center".toLowerCase());
      viewerCountFontAlignBottomQueryIndex = dataToDisplay.findIndex(element => element.query_name == "viewer_count_font_align_bottom".toLowerCase());
      if (viewerCountFontAlignRightQueryIndex >= 0) {
        if (dataToDisplay[viewerCountFontAlignRightQueryIndex].is_valid == false) {
          // Use default_value here
          viewerCountFontAlignRight = LEFT;
        }
        if (dataToDisplay[viewerCountFontAlignRightQueryIndex].is_valid == true) {
          // Use query_value here
          if (dataToDisplay[viewerCountFontAlignRightQueryIndex].query_value == false) {
            viewerCountFontAlignRight = LEFT;
          }
          if (dataToDisplay[viewerCountFontAlignRightQueryIndex].query_value == true) {
            viewerCountFontAlignRight = RIGHT;
          }
        }
      }
      if (viewerCountFontAlignCenterQueryIndex >= 0) {
        if (dataToDisplay[viewerCountFontAlignCenterQueryIndex].is_valid == false) {
          // Use default_value here
          viewerCountFontAlignCenter = viewerCountFontAlignRight;
        }
        if (dataToDisplay[viewerCountFontAlignCenterQueryIndex].is_valid == true) {
          // Use query_value here
          if (dataToDisplay[viewerCountFontAlignCenterQueryIndex].query_value == false) {
            viewerCountFontAlignCenter = viewerCountFontAlignRight;
          }
          if (dataToDisplay[viewerCountFontAlignCenterQueryIndex].query_value == true) {
            viewerCountFontAlignCenter = CENTER;
          }
        }
      }
      if (viewerCountFontAlignBottomQueryIndex >= 0) {
        if (dataToDisplay[viewerCountFontAlignBottomQueryIndex].is_valid == false) {
          // Use default_value here
          viewerCountFontAlignBottom = TOP;
        }
        if (dataToDisplay[viewerCountFontAlignBottomQueryIndex].is_valid == true) {
          // Use query_value here
          if (dataToDisplay[viewerCountFontAlignBottomQueryIndex].query_value == false) {
            viewerCountFontAlignBottom = TOP;
          }
          if (dataToDisplay[viewerCountFontAlignBottomQueryIndex].query_value == true) {
            viewerCountFontAlignBottom = BOTTOM;
          }
        }
      }

      //Below are processing steps related to stream uptime
      twitchStreamUptimeXPosQueryIndex = dataToDisplay.findIndex(element => element.query_name == "twitch_stream_uptime_xpos".toLowerCase());
      twitchStreamUptimeYPosQueryIndex = dataToDisplay.findIndex(element => element.query_name == "twitch_stream_uptime_ypos".toLowerCase());
      if (twitchStreamUptimeXPosQueryIndex >= 0) {
        if (dataToDisplay[twitchStreamUptimeXPosQueryIndex].is_valid == false) {
          // Use default_value here
          twitchStreamUptimeXPos = dataToDisplay[twitchStreamUptimeXPosQueryIndex].default_value;
        }
        if (dataToDisplay[twitchStreamUptimeXPosQueryIndex].is_valid == true) {
          // Use query_value here
          twitchStreamUptimeXPos = dataToDisplay[twitchStreamUptimeXPosQueryIndex].query_value;
        }
      }
      if (twitchStreamUptimeYPosQueryIndex >= 0) {
        if (dataToDisplay[twitchStreamUptimeYPosQueryIndex].is_valid == false) {
          // Use default_value here
          twitchStreamUptimeYPos = dataToDisplay[twitchStreamUptimeYPosQueryIndex].default_value;
        }
        if (dataToDisplay[twitchStreamUptimeYPosQueryIndex].is_valid == true) {
          // Use query_value here
          twitchStreamUptimeYPos = dataToDisplay[twitchStreamUptimeYPosQueryIndex].query_value;
        }
      }

      twitchStreamUptimeFontSizeQueryIndex = dataToDisplay.findIndex(element => element.query_name == "twitch_stream_uptime_font_size".toLowerCase());
      if (twitchStreamUptimeFontSizeQueryIndex >= 0) {
        if (dataToDisplay[twitchStreamUptimeFontSizeQueryIndex].is_valid == false) {
          // Use default_value here
          twitchStreamUptimeFontSize = dataToDisplay[twitchStreamUptimeFontSizeQueryIndex].default_value;
        }
        if (dataToDisplay[twitchStreamUptimeFontSizeQueryIndex].is_valid == true) {
          // Use query_value here
          twitchStreamUptimeFontSize = dataToDisplay[twitchStreamUptimeFontSizeQueryIndex].query_value;
        }
      }

      twitchStreamUptimeFontSizeUseMultiplierQueryIndex = dataToDisplay.findIndex(element => element.query_name == "twitch_stream_uptime_font_size_use_multiplier".toLowerCase());
      if (twitchStreamUptimeFontSizeUseMultiplierQueryIndex >= 0) {
        if (dataToDisplay[twitchStreamUptimeFontSizeUseMultiplierQueryIndex].is_valid == false) {
          // Use default_value here
          twitchStreamUptimeFontSizeUseMultiplier = dataToDisplay[twitchStreamUptimeFontSizeUseMultiplierQueryIndex].default_value;
        }
        if (dataToDisplay[twitchStreamUptimeFontSizeUseMultiplierQueryIndex].is_valid == true) {
          // Use query_value here
          twitchStreamUptimeFontSizeUseMultiplier = dataToDisplay[twitchStreamUptimeFontSizeUseMultiplierQueryIndex].query_value;
        }
      }

      twitchStreamUptimeFontStrokeWeightQueryIndex = dataToDisplay.findIndex(element => element.query_name == "twitch_stream_uptime_font_stroke_weight".toLowerCase());
      if (twitchStreamUptimeFontStrokeWeightQueryIndex >= 0) {
        if (dataToDisplay[twitchStreamUptimeFontStrokeWeightQueryIndex].is_valid == false) {
          // Use default_value here
          twitchStreamUptimeFontStrokeWeight = dataToDisplay[twitchStreamUptimeFontStrokeWeightQueryIndex].default_value;
        }
        if (dataToDisplay[twitchStreamUptimeFontStrokeWeightQueryIndex].is_valid == true) {
          // Use query_value here
          twitchStreamUptimeFontStrokeWeight = dataToDisplay[twitchStreamUptimeFontStrokeWeightQueryIndex].query_value;
        }
      }

      twitchStreamUptimeFontStrokeWeightUseMultiplierQueryIndex = dataToDisplay.findIndex(element => element.query_name == "twitch_stream_uptime_font_stroke_weight_use_multiplier".toLowerCase());
      if (twitchStreamUptimeFontStrokeWeightUseMultiplierQueryIndex >= 0) {
        if (dataToDisplay[twitchStreamUptimeFontStrokeWeightUseMultiplierQueryIndex].is_valid == false) {
          // Use default_value here
          twitchStreamUptimeFontStrokeWeightUseMultiplier = dataToDisplay[twitchStreamUptimeFontStrokeWeightUseMultiplierQueryIndex].default_value;
        }
        if (dataToDisplay[twitchStreamUptimeFontStrokeWeightUseMultiplierQueryIndex].is_valid == true) {
          // Use query_value here
          twitchStreamUptimeFontStrokeWeightUseMultiplier = dataToDisplay[twitchStreamUptimeFontStrokeWeightUseMultiplierQueryIndex].query_value;
        }
      }

      twitchStreamUptimeFontLeadingQueryIndex = dataToDisplay.findIndex(element => element.query_name == "twitch_stream_uptime_font_leading".toLowerCase());
      if (twitchStreamUptimeFontLeadingQueryIndex >= 0) {
        if (dataToDisplay[twitchStreamUptimeFontLeadingQueryIndex].is_valid == false) {
          // Use default_value here
          twitchStreamUptimeFontLeading = dataToDisplay[twitchStreamUptimeFontLeadingQueryIndex].default_value;
        }
        if (dataToDisplay[twitchStreamUptimeFontLeadingQueryIndex].is_valid == true) {
          // Use query_value here
          twitchStreamUptimeFontLeading = dataToDisplay[twitchStreamUptimeFontLeadingQueryIndex].query_value;
        }
      }

      twitchStreamUptimeFontLeadingUseMultiplierQueryIndex = dataToDisplay.findIndex(element => element.query_name == "twitch_stream_uptime_font_leading_use_multiplier".toLowerCase());
      if (twitchStreamUptimeFontLeadingUseMultiplierQueryIndex >= 0) {
        if (dataToDisplay[twitchStreamUptimeFontLeadingUseMultiplierQueryIndex].is_valid == false) {
          // Use default_value here
          twitchStreamUptimeFontLeadingUseMultiplier = dataToDisplay[twitchStreamUptimeFontLeadingUseMultiplierQueryIndex].default_value;
        }
        if (dataToDisplay[twitchStreamUptimeFontLeadingUseMultiplierQueryIndex].is_valid == true) {
          // Use query_value here
          twitchStreamUptimeFontLeadingUseMultiplier = dataToDisplay[twitchStreamUptimeFontLeadingUseMultiplierQueryIndex].query_value;
        }
      }

      twitchStreamUptimeFontAlignRightQueryIndex = dataToDisplay.findIndex(element => element.query_name == "twitch_stream_uptime_font_align_right".toLowerCase());
      twitchStreamUptimeFontAlignCenterQueryIndex = dataToDisplay.findIndex(element => element.query_name == "twitch_stream_uptime_font_align_center".toLowerCase());
      twitchStreamUptimeFontAlignBottomQueryIndex = dataToDisplay.findIndex(element => element.query_name == "twitch_stream_uptime_font_align_bottom".toLowerCase());
      if (twitchStreamUptimeFontAlignRightQueryIndex >= 0) {
        if (dataToDisplay[twitchStreamUptimeFontAlignRightQueryIndex].is_valid == false) {
          // Use default_value here
          twitchStreamUptimeFontAlignRight = LEFT;
        }
        if (dataToDisplay[twitchStreamUptimeFontAlignRightQueryIndex].is_valid == true) {
          // Use query_value here
          if (dataToDisplay[twitchStreamUptimeFontAlignRightQueryIndex].query_value == false) {
            twitchStreamUptimeFontAlignRight = LEFT;
          }
          if (dataToDisplay[twitchStreamUptimeFontAlignRightQueryIndex].query_value == true) {
            twitchStreamUptimeFontAlignRight = RIGHT;
          }
        }
      }
      if (twitchStreamUptimeFontAlignCenterQueryIndex >= 0) {
        if (dataToDisplay[twitchStreamUptimeFontAlignCenterQueryIndex].is_valid == false) {
          // Use default_value here
          twitchStreamUptimeFontAlignCenter = twitchStreamUptimeFontAlignRight;
        }
        if (dataToDisplay[twitchStreamUptimeFontAlignCenterQueryIndex].is_valid == true) {
          // Use query_value here
          if (dataToDisplay[twitchStreamUptimeFontAlignCenterQueryIndex].query_value == false) {
            twitchStreamUptimeFontAlignCenter = twitchStreamUptimeFontAlignRight;
          }
          if (dataToDisplay[twitchStreamUptimeFontAlignCenterQueryIndex].query_value == true) {
            twitchStreamUptimeFontAlignCenter = CENTER;
          }
        }
      }
      if (twitchStreamUptimeFontAlignBottomQueryIndex >= 0) {
        if (dataToDisplay[twitchStreamUptimeFontAlignBottomQueryIndex].is_valid == false) {
          // Use default_value here
          twitchStreamUptimeFontAlignBottom = TOP;
        }
        if (dataToDisplay[twitchStreamUptimeFontAlignBottomQueryIndex].is_valid == true) {
          // Use query_value here
          if (dataToDisplay[twitchStreamUptimeFontAlignBottomQueryIndex].query_value == false) {
            twitchStreamUptimeFontAlignBottom = TOP;
          }
          if (dataToDisplay[twitchStreamUptimeFontAlignBottomQueryIndex].query_value == true) {
            twitchStreamUptimeFontAlignBottom = BOTTOM;
          }
        }
      }

      //console.log(new Date().toISOString() + " THIS IS A TEST");
      if (streamStatus.is_stream_live == true) {
        if (isDisplayViewerCountValid == true) {
          textFont(font);
          recalculateFont(viewerCountFontSize, viewerCountFontStrokeWeight);
          if (viewerCountFontSizeUseMultiplier == true) {
            textSize(textSizeToUse);
          }
          if (viewerCountFontSizeUseMultiplier == false) {
            textSize(viewerCountFontSize);
          }
          if (viewerCountFontStrokeWeightUseMultiplier == true) {
            strokeWeight(fontStrokeWeight);
          }
          if (viewerCountFontStrokeWeightUseMultiplier == false) {
            strokeWeight(viewerCountFontStrokeWeight);
          }
          stroke("#000000FF");
          textAlign(viewerCountFontAlignCenter, viewerCountFontAlignBottom);
          fill("#FFFFFFFF");
          if (viewerCountFontLeadingUseMultiplier == true) {
            textLeading(textDefaultLeadingToUse);
          }
          if (viewerCountFontLeadingUseMultiplier == false) {
            textLeading(viewerCountFontLeading);
          }
          text(streamStatus.stream_status_viewer_count + " Viewers", viewerCountXPos, viewerCountYPos);
        }
        if (isDisplayTwitchUptimeStreamValid == true) {
          textFont(font);
          recalculateFont(twitchStreamUptimeFontSize, twitchStreamUptimeFontStrokeWeight);
          if (twitchStreamUptimeFontSizeUseMultiplier == true) {
            textSize(textSizeToUse);
          }
          if (twitchStreamUptimeFontSizeUseMultiplier == false) {
            textSize(twitchStreamUptimeFontSize);
          }
          if (twitchStreamUptimeFontStrokeWeightUseMultiplier == true) {
            strokeWeight(fontStrokeWeight);
          }
          if (twitchStreamUptimeFontStrokeWeightUseMultiplier == false) {
            strokeWeight(twitchStreamUptimeFontStrokeWeight);
          }
          stroke("#000000FF");
          textAlign(twitchStreamUptimeFontAlignCenter, twitchStreamUptimeFontAlignBottom);
          fill("#FFFFFFFF");
          if (twitchStreamUptimeFontLeadingUseMultiplier == true) {
            textLeading(textDefaultLeadingToUse);
          }
          if (twitchStreamUptimeFontLeadingUseMultiplier == false) {
            textLeading(twitchStreamUptimeFontLeading);
          }
          text(streamStatus.stream_status_uptime_string, twitchStreamUptimeXPos, twitchStreamUptimeYPos);
        }
      }
      if (streamStatus.is_stream_live == false) {
        if (isDisplayViewerCountValid == true) {
          textFont(font);
          recalculateFont(viewerCountFontSize, viewerCountFontStrokeWeight);
          if (viewerCountFontSizeUseMultiplier == true) {
            textSize(textSizeToUse);
          }
          if (viewerCountFontSizeUseMultiplier == false) {
            textSize(viewerCountFontSize);
          }
          if (viewerCountFontStrokeWeightUseMultiplier == true) {
            strokeWeight(fontStrokeWeight);
          }
          if (viewerCountFontStrokeWeightUseMultiplier == false) {
            strokeWeight(viewerCountFontStrokeWeight);
          }
          stroke("#000000FF");
          textAlign(viewerCountFontAlignCenter, viewerCountFontAlignBottom);
          fill("#FFFFFFFF");
          if (viewerCountFontLeadingUseMultiplier == true) {
            textLeading(textDefaultLeadingToUse);
          }
          if (viewerCountFontLeadingUseMultiplier == false) {
            textLeading(viewerCountFontLeading);
          }
          text("OFFLINE", viewerCountXPos, viewerCountYPos);
        }
        if (isDisplayTwitchUptimeStreamValid == true) {
          recalculateFont(twitchStreamUptimeFontSize, twitchStreamUptimeFontStrokeWeight);
          if (twitchStreamUptimeFontSizeUseMultiplier == true) {
            textSize(textSizeToUse);
          }
          if (twitchStreamUptimeFontSizeUseMultiplier == false) {
            textSize(twitchStreamUptimeFontSize);
          }
          if (twitchStreamUptimeFontStrokeWeightUseMultiplier == true) {
            strokeWeight(fontStrokeWeight);
          }
          if (twitchStreamUptimeFontStrokeWeightUseMultiplier == false) {
            strokeWeight(twitchStreamUptimeFontStrokeWeight);
          }
          stroke("#000000FF");
          textAlign(twitchStreamUptimeFontAlignCenter, twitchStreamUptimeFontAlignBottom);
          fill("#FFFFFFFF");
          if (twitchStreamUptimeFontLeadingUseMultiplier == true) {
            textLeading(textDefaultLeadingToUse);
          }
          if (twitchStreamUptimeFontLeadingUseMultiplier == false) {
            textLeading(twitchStreamUptimeFontLeading);
          }
          text("OFFLINE", twitchStreamUptimeXPos, twitchStreamUptimeYPos);
        }
      }
    }
  }
  if (socket.connected == false) {
    //console.log(new Date().toISOString() + " Are we disconnected?");
    streamStatus = {
      stream_status_started_at: "",
      stream_status_started_at_millis: 0,
      stream_status_viewer_count: 0,
      twitch_api_status_code: -1,
      time_uptime_was_requested: 0,
      uptime_total: 0,
      server_start_time: 0,
      server_start_time_string: "",
      is_stream_live: false,
      uptime_string: "",
      stream_status_delta_uptime: 0,
      stream_status_uptime_string: "",
      twitch_channel_status_raw_response: {}
    };
    isAnyRequestedTwitchDataValid = false;
    isDisplayViewerCountValid = false;
    isDisplayTwitchUptimeStreamValid = false;

    // Below are variables related to viewer count
    viewerCountXPosQueryIndex = -1;
    viewerCountYPosQueryIndex = -1;
    viewerCountXPos = 0;
    viewerCountYPos = 0;

    viewerCountFontSizeQueryIndex = -1;
    viewerCountFontSize = 0;

    viewerCountFontSizeUseMultiplierQueryIndex = -1;
    viewerCountFontSizeUseMultiplier = false;

    viewerCountFontStrokeWeightQueryIndex = -1;
    viewerCountFontStrokeWeight = 0;

    viewerCountFontStrokeWeightUseMultiplierQueryIndex = -1;
    viewerCountFontStrokeWeightUseMultiplier = false;

    viewerCountFontLeadingQueryIndex = -1;
    viewerCountFontLeading = 0;

    viewerCountFontLeadingUseMultiplierQueryIndex = -1;
    viewerCountFontLeadingUseMultiplier = false;

    viewerCountFontAlignRightQueryIndex = -1;
    viewerCountFontAlignRight = LEFT;

    viewerCountFontAlignCenterQueryIndex = -1;
    viewerCountFontAlignCenter = LEFT;

    viewerCountFontAlignBottomQueryIndex = -1;
    viewerCountFontAlignBottom = TOP;

    // Below are variables related to stream uptime
    twitchStreamUptimeXPosQueryIndex = -1;
    twitchStreamUptimeYPosQueryIndex = -1;
    twitchStreamUptimeXPos = 0;
    twitchStreamUptimeYPos = 0;

    twitchStreamUptimeFontSizeQueryIndex = -1;
    twitchStreamUptimeFontSize = 0;

    twitchStreamUptimeFontSizeUseMultiplierQueryIndex = -1;
    twitchStreamUptimeFontSizeUseMultiplier = false;

    twitchStreamUptimeFontStrokeWeightQueryIndex = -1;
    twitchStreamUptimeFontStrokeWeight = 0;

    twitchStreamUptimeFontStrokeWeightUseMultiplierQueryIndex = -1;
    twitchStreamUptimeFontStrokeWeightUseMultiplier = false;

    twitchStreamUptimeFontLeadingQueryIndex = -1;
    twitchStreamUptimeFontLeading = 0;

    twitchStreamUptimeFontLeadingUseMultiplierQueryIndex = -1;
    twitchStreamUptimeFontLeadingUseMultiplier = false;

    twitchStreamUptimeFontAlignRightQueryIndex = -1;
    twitchStreamUptimeFontAlignRight = LEFT;

    twitchStreamUptimeFontAlignCenterQueryIndex = -1;
    twitchStreamUptimeFontAlignCenter = LEFT;

    twitchStreamUptimeFontAlignBottomQueryIndex = -1;
    twitchStreamUptimeFontAlignBottom = TOP;

    // Below are variables related to current time
    displayCurrentTimeQueryIndex = -1;
    displayCurrentTime = false;

    currentTimeXPosQueryIndex = -1;
    currentTimeYPosQueryIndex = -1;
    currentTimeXPos = 0;
    currentTimeYPos = 0;

    currentTimeFontSizeQueryIndex = -1;
    currentTimeFontSize = 0;

    currentTimeFontSizeUseMultiplierQueryIndex = -1;
    currentTimeFontSizeUseMultiplier = false;

    currentTimeFontStrokeWeightQueryIndex = -1;
    currentTimeFontStrokeWeight = 0;

    currentTimeFontStrokeWeightUseMultiplierQueryIndex = -1;
    currentTimeFontStrokeWeightUseMultiplier = false;

    currentTimeFontLeadingQueryIndex = -1;
    currentTimeFontLeading = 0;

    currentTimeFontLeadingUseMultiplierQueryIndex = -1;
    currentTimeFontLeadingUseMultiplier = false;

    currentTimeFontAlignRightQueryIndex = -1;
    currentTimeFontAlignRight = LEFT;

    currentTimeFontAlignCenterQueryIndex = -1;
    currentTimeFontAlignCenter = LEFT;

    currentTimeFontAlignBottomQueryIndex = -1;
    currentTimeFontAlignBottom = TOP;

    // Below are variables related to loading strings
    displayLoadingStringsQueryIndex = -1;
    displayLoadingStrings = false;
    
    loadingStringsXPosQueryIndex = -1;
    loadingStringsYPosQueryIndex = -1;
    loadingStringsXPos = 0;
    loadingStringsYPos = 0;
    
    loadingStringsFontSizeQueryIndex = -1;
    loadingStringsFontSize = 0;
    
    loadingStringsFontSizeUseMultiplierQueryIndex = -1;
    loadingStringsFontSizeUseMultiplier = false;
    
    loadingStringsFontStrokeWeightQueryIndex = -1;
    loadingStringsFontStrokeWeight = 0;
    
    loadingStringsFontStrokeWeightUseMultiplierQueryIndex = -1;
    loadingStringsFontStrokeWeightUseMultiplier = false;
    
    loadingStringsFontLeadingQueryIndex = -1;
    loadingStringsFontLeading = 0;
    
    loadingStringsFontLeadingUseMultiplierQueryIndex = -1;
    loadingStringsFontLeadingUseMultiplier = false;
    
    loadingStringsFontAlignRightQueryIndex = -1;
    loadingStringsFontAlignRight = LEFT;

    loadingStringsFontAlignCenterQueryIndex = -1;
    loadingStringsFontAlignCenter = LEFT;
    
    loadingStringsFontAlignBottomQueryIndex = -1;
    loadingStringsFontAlignBottom = TOP;
  }

  //Below are processing steps related to current time
  currentTimeXPosQueryIndex = dataToDisplay.findIndex(element => element.query_name == "current_time_xpos".toLowerCase());
  currentTimeYPosQueryIndex = dataToDisplay.findIndex(element => element.query_name == "current_time_ypos".toLowerCase());
  if (currentTimeXPosQueryIndex >= 0) {
    if (dataToDisplay[currentTimeXPosQueryIndex].is_valid == false) {
      // Use default_value here
      currentTimeXPos = dataToDisplay[currentTimeXPosQueryIndex].default_value;
    }
    if (dataToDisplay[currentTimeXPosQueryIndex].is_valid == true) {
      // Use query_value here
      currentTimeXPos = dataToDisplay[currentTimeXPosQueryIndex].query_value;
    }
  }
  if (currentTimeYPosQueryIndex >= 0) {
    if (dataToDisplay[currentTimeYPosQueryIndex].is_valid == false) {
      // Use default_value here
      currentTimeYPos = dataToDisplay[currentTimeYPosQueryIndex].default_value;
    }
    if (dataToDisplay[currentTimeYPosQueryIndex].is_valid == true) {
      // Use query_value here
      currentTimeYPos = dataToDisplay[currentTimeYPosQueryIndex].query_value;
    }
  }

  currentTimeFontSizeQueryIndex = dataToDisplay.findIndex(element => element.query_name == "current_time_font_size".toLowerCase());
  if (currentTimeFontSizeQueryIndex >= 0) {
    if (dataToDisplay[currentTimeFontSizeQueryIndex].is_valid == false) {
      // Use default_value here
      currentTimeFontSize = dataToDisplay[currentTimeFontSizeQueryIndex].default_value;
    }
    if (dataToDisplay[currentTimeFontSizeQueryIndex].is_valid == true) {
      // Use query_value here
      currentTimeFontSize = dataToDisplay[currentTimeFontSizeQueryIndex].query_value;
    }
  }

  currentTimeFontSizeUseMultiplierQueryIndex = dataToDisplay.findIndex(element => element.query_name == "current_time_font_size_use_multiplier".toLowerCase());
  if (currentTimeFontSizeUseMultiplierQueryIndex >= 0) {
    if (dataToDisplay[currentTimeFontSizeUseMultiplierQueryIndex].is_valid == false) {
      // Use default_value here
      currentTimeFontSizeUseMultiplier = dataToDisplay[currentTimeFontSizeUseMultiplierQueryIndex].default_value;
    }
    if (dataToDisplay[currentTimeFontSizeUseMultiplierQueryIndex].is_valid == true) {
      // Use query_value here
      currentTimeFontSizeUseMultiplier = dataToDisplay[currentTimeFontSizeUseMultiplierQueryIndex].query_value;
    }
  }

  currentTimeFontStrokeWeightQueryIndex = dataToDisplay.findIndex(element => element.query_name == "current_time_font_stroke_weight".toLowerCase());
  if (currentTimeFontStrokeWeightQueryIndex >= 0) {
    if (dataToDisplay[currentTimeFontStrokeWeightQueryIndex].is_valid == false) {
      // Use default_value here
      currentTimeFontStrokeWeight = dataToDisplay[currentTimeFontStrokeWeightQueryIndex].default_value;
    }
    if (dataToDisplay[currentTimeFontStrokeWeightQueryIndex].is_valid == true) {
      // Use query_value here
      currentTimeFontStrokeWeight = dataToDisplay[currentTimeFontStrokeWeightQueryIndex].query_value;
    }
  }

  currentTimeFontStrokeWeightUseMultiplierQueryIndex = dataToDisplay.findIndex(element => element.query_name == "current_time_font_stroke_weight_use_multiplier".toLowerCase());
  if (currentTimeFontStrokeWeightUseMultiplierQueryIndex >= 0) {
    if (dataToDisplay[currentTimeFontStrokeWeightUseMultiplierQueryIndex].is_valid == false) {
      // Use default_value here
      currentTimeFontStrokeWeightUseMultiplier = dataToDisplay[currentTimeFontStrokeWeightUseMultiplierQueryIndex].default_value;
    }
    if (dataToDisplay[currentTimeFontStrokeWeightUseMultiplierQueryIndex].is_valid == true) {
      // Use query_value here
      currentTimeFontStrokeWeightUseMultiplier = dataToDisplay[currentTimeFontStrokeWeightUseMultiplierQueryIndex].query_value;
    }
  }

  currentTimeFontLeadingQueryIndex = dataToDisplay.findIndex(element => element.query_name == "current_time_font_leading".toLowerCase());
  if (currentTimeFontLeadingQueryIndex >= 0) {
    if (dataToDisplay[currentTimeFontLeadingQueryIndex].is_valid == false) {
      // Use default_value here
      currentTimeFontLeading = dataToDisplay[currentTimeFontLeadingQueryIndex].default_value;
    }
    if (dataToDisplay[currentTimeFontLeadingQueryIndex].is_valid == true) {
      // Use query_value here
      currentTimeFontLeading = dataToDisplay[currentTimeFontLeadingQueryIndex].query_value;
    }
  }

  currentTimeFontLeadingUseMultiplierQueryIndex = dataToDisplay.findIndex(element => element.query_name == "current_time_font_leading_use_multiplier".toLowerCase());
  if (currentTimeFontLeadingUseMultiplierQueryIndex >= 0) {
    if (dataToDisplay[currentTimeFontLeadingUseMultiplierQueryIndex].is_valid == false) {
      // Use default_value here
      currentTimeFontLeadingUseMultiplier = dataToDisplay[currentTimeFontLeadingUseMultiplierQueryIndex].default_value;
    }
    if (dataToDisplay[currentTimeFontLeadingUseMultiplierQueryIndex].is_valid == true) {
      // Use query_value here
      currentTimeFontLeadingUseMultiplier = dataToDisplay[currentTimeFontLeadingUseMultiplierQueryIndex].query_value;
    }
  }

  currentTimeFontAlignRightQueryIndex = dataToDisplay.findIndex(element => element.query_name == "current_time_font_align_right".toLowerCase());
  currentTimeFontAlignCenterQueryIndex = dataToDisplay.findIndex(element => element.query_name == "current_time_font_align_center".toLowerCase());
  currentTimeFontAlignBottomQueryIndex = dataToDisplay.findIndex(element => element.query_name == "current_time_font_align_bottom".toLowerCase());
  if (currentTimeFontAlignRightQueryIndex >= 0) {
    if (dataToDisplay[currentTimeFontAlignRightQueryIndex].is_valid == false) {
      // Use default_value here
      currentTimeFontAlignRight = LEFT;
    }
    if (dataToDisplay[currentTimeFontAlignRightQueryIndex].is_valid == true) {
      // Use query_value here
      if (dataToDisplay[currentTimeFontAlignRightQueryIndex].query_value == false) {
        currentTimeFontAlignRight = LEFT;
      }
      if (dataToDisplay[currentTimeFontAlignRightQueryIndex].query_value == true) {
        currentTimeFontAlignRight = RIGHT;
      }
    }
  }
  if (currentTimeFontAlignCenterQueryIndex >= 0) {
    if (dataToDisplay[currentTimeFontAlignCenterQueryIndex].is_valid == false) {
      // Use default_value here
      currentTimeFontAlignCenter = currentTimeFontAlignRight;
    }
    if (dataToDisplay[currentTimeFontAlignCenterQueryIndex].is_valid == true) {
      // Use query_value here
      if (dataToDisplay[currentTimeFontAlignCenterQueryIndex].query_value == false) {
        currentTimeFontAlignCenter = currentTimeFontAlignRight;
      }
      if (dataToDisplay[currentTimeFontAlignCenterQueryIndex].query_value == true) {
        currentTimeFontAlignCenter = CENTER;
      }
    }
  }
  if (currentTimeFontAlignBottomQueryIndex >= 0) {
    if (dataToDisplay[currentTimeFontAlignBottomQueryIndex].is_valid == false) {
      // Use default_value here
      currentTimeFontAlignBottom = TOP;
    }
    if (dataToDisplay[currentTimeFontAlignBottomQueryIndex].is_valid == true) {
      // Use query_value here
      if (dataToDisplay[currentTimeFontAlignBottomQueryIndex].query_value == false) {
        currentTimeFontAlignBottom = TOP;
      }
      if (dataToDisplay[currentTimeFontAlignBottomQueryIndex].query_value == true) {
        currentTimeFontAlignBottom = BOTTOM;
      }
    }
  }

  displayCurrentTimeQueryIndex = dataToDisplay.findIndex(element => element.query_name == "display_current_time".toLowerCase());
  if (displayCurrentTimeQueryIndex >= 0) {
    if (dataToDisplay[displayCurrentTimeQueryIndex].is_valid == false) {
      // Use default_value here
      displayCurrentTime = dataToDisplay[displayCurrentTimeQueryIndex].default_value;
    }
    if (dataToDisplay[displayCurrentTimeQueryIndex].is_valid == true) {
      // Use query_value here
      displayCurrentTime = dataToDisplay[displayCurrentTimeQueryIndex].query_value;
    }
  }

  if (displayCurrentTime == true) {
    textFont(font);
    recalculateFont(currentTimeFontSize, currentTimeFontStrokeWeight);
    if (currentTimeFontSizeUseMultiplier == true) {
      textSize(textSizeToUse);
    }
    if (currentTimeFontSizeUseMultiplier == false) {
      textSize(currentTimeFontSize);
    }
    if (currentTimeFontStrokeWeightUseMultiplier == true) {
      strokeWeight(fontStrokeWeight);
    }
    if (currentTimeFontStrokeWeightUseMultiplier == false) {
      strokeWeight(currentTimeFontStrokeWeight);
    }
    stroke("#000000FF");
    textAlign(currentTimeFontAlignCenter, currentTimeFontAlignBottom);
    fill("#FFFFFFFF");
    if (currentTimeFontLeadingUseMultiplier == true) {
      textLeading(textDefaultLeadingToUse);
    }
    if (currentTimeFontLeadingUseMultiplier == false) {
      textLeading(currentTimeFontLeading);
    }
    text(new Date().toISOString(), currentTimeXPos, currentTimeYPos);
  }

  //Below are processing steps related to loading strings
  loadingStringsXPosQueryIndex = dataToDisplay.findIndex(element => element.query_name == "loading_strings_xpos".toLowerCase());
  loadingStringsYPosQueryIndex = dataToDisplay.findIndex(element => element.query_name == "loading_strings_ypos".toLowerCase());
  if (loadingStringsXPosQueryIndex >= 0) {
    if (dataToDisplay[loadingStringsXPosQueryIndex].is_valid == false) {
      // Use default_value here
      loadingStringsXPos = dataToDisplay[loadingStringsXPosQueryIndex].default_value;
    }
    if (dataToDisplay[loadingStringsXPosQueryIndex].is_valid == true) {
      // Use query_value here
      loadingStringsXPos = dataToDisplay[loadingStringsXPosQueryIndex].query_value;
    }
  }
  if (loadingStringsYPosQueryIndex >= 0) {
    if (dataToDisplay[loadingStringsYPosQueryIndex].is_valid == false) {
      // Use default_value here
      loadingStringsYPos = dataToDisplay[loadingStringsYPosQueryIndex].default_value;
    }
    if (dataToDisplay[loadingStringsYPosQueryIndex].is_valid == true) {
      // Use query_value here
      loadingStringsYPos = dataToDisplay[loadingStringsYPosQueryIndex].query_value;
    }
  }

  loadingStringsFontSizeQueryIndex = dataToDisplay.findIndex(element => element.query_name == "loading_strings_font_size".toLowerCase());
  if (loadingStringsFontSizeQueryIndex >= 0) {
    if (dataToDisplay[loadingStringsFontSizeQueryIndex].is_valid == false) {
      // Use default_value here
      loadingStringsFontSize = dataToDisplay[loadingStringsFontSizeQueryIndex].default_value;
    }
    if (dataToDisplay[loadingStringsFontSizeQueryIndex].is_valid == true) {
      // Use query_value here
      loadingStringsFontSize = dataToDisplay[loadingStringsFontSizeQueryIndex].query_value;
    }
  }

  loadingStringsFontSizeUseMultiplierQueryIndex = dataToDisplay.findIndex(element => element.query_name == "loading_strings_font_size_use_multiplier".toLowerCase());
  if (loadingStringsFontSizeUseMultiplierQueryIndex >= 0) {
    if (dataToDisplay[loadingStringsFontSizeUseMultiplierQueryIndex].is_valid == false) {
      // Use default_value here
      loadingStringsFontSizeUseMultiplier = dataToDisplay[loadingStringsFontSizeUseMultiplierQueryIndex].default_value;
    }
    if (dataToDisplay[loadingStringsFontSizeUseMultiplierQueryIndex].is_valid == true) {
      // Use query_value here
      loadingStringsFontSizeUseMultiplier = dataToDisplay[loadingStringsFontSizeUseMultiplierQueryIndex].query_value;
    }
  }

  loadingStringsFontStrokeWeightQueryIndex = dataToDisplay.findIndex(element => element.query_name == "loading_strings_font_stroke_weight".toLowerCase());
  if (loadingStringsFontStrokeWeightQueryIndex >= 0) {
    if (dataToDisplay[loadingStringsFontStrokeWeightQueryIndex].is_valid == false) {
      // Use default_value here
      loadingStringsFontStrokeWeight = dataToDisplay[loadingStringsFontStrokeWeightQueryIndex].default_value;
    }
    if (dataToDisplay[loadingStringsFontStrokeWeightQueryIndex].is_valid == true) {
      // Use query_value here
      loadingStringsFontStrokeWeight = dataToDisplay[loadingStringsFontStrokeWeightQueryIndex].query_value;
    }
  }

  loadingStringsFontStrokeWeightUseMultiplierQueryIndex = dataToDisplay.findIndex(element => element.query_name == "loading_strings_font_stroke_weight_use_multiplier".toLowerCase());
  if (loadingStringsFontStrokeWeightUseMultiplierQueryIndex >= 0) {
    if (dataToDisplay[loadingStringsFontStrokeWeightUseMultiplierQueryIndex].is_valid == false) {
      // Use default_value here
      loadingStringsFontStrokeWeightUseMultiplier = dataToDisplay[loadingStringsFontStrokeWeightUseMultiplierQueryIndex].default_value;
    }
    if (dataToDisplay[loadingStringsFontStrokeWeightUseMultiplierQueryIndex].is_valid == true) {
      // Use query_value here
      loadingStringsFontStrokeWeightUseMultiplier = dataToDisplay[loadingStringsFontStrokeWeightUseMultiplierQueryIndex].query_value;
    }
  }

  loadingStringsFontLeadingQueryIndex = dataToDisplay.findIndex(element => element.query_name == "loading_strings_font_leading".toLowerCase());
  if (loadingStringsFontLeadingQueryIndex >= 0) {
    if (dataToDisplay[loadingStringsFontLeadingQueryIndex].is_valid == false) {
      // Use default_value here
      loadingStringsFontLeading = dataToDisplay[loadingStringsFontLeadingQueryIndex].default_value;
    }
    if (dataToDisplay[loadingStringsFontLeadingQueryIndex].is_valid == true) {
      // Use query_value here
      loadingStringsFontLeading = dataToDisplay[loadingStringsFontLeadingQueryIndex].query_value;
    }
  }

  loadingStringsFontLeadingUseMultiplierQueryIndex = dataToDisplay.findIndex(element => element.query_name == "loading_strings_font_leading_use_multiplier".toLowerCase());
  if (loadingStringsFontLeadingUseMultiplierQueryIndex >= 0) {
    if (dataToDisplay[loadingStringsFontLeadingUseMultiplierQueryIndex].is_valid == false) {
      // Use default_value here
      loadingStringsFontLeadingUseMultiplier = dataToDisplay[loadingStringsFontLeadingUseMultiplierQueryIndex].default_value;
    }
    if (dataToDisplay[loadingStringsFontLeadingUseMultiplierQueryIndex].is_valid == true) {
      // Use query_value here
      loadingStringsFontLeadingUseMultiplier = dataToDisplay[loadingStringsFontLeadingUseMultiplierQueryIndex].query_value;
    }
  }

  loadingStringsFontAlignRightQueryIndex = dataToDisplay.findIndex(element => element.query_name == "loading_strings_font_align_right".toLowerCase());
  loadingStringsFontAlignCenterQueryIndex = dataToDisplay.findIndex(element => element.query_name == "loading_strings_font_align_center".toLowerCase());
  loadingStringsFontAlignBottomQueryIndex = dataToDisplay.findIndex(element => element.query_name == "loading_strings_font_align_bottom".toLowerCase());
  if (loadingStringsFontAlignRightQueryIndex >= 0) {
    if (dataToDisplay[loadingStringsFontAlignRightQueryIndex].is_valid == false) {
      // Use default_value here
      loadingStringsFontAlignRight = LEFT;
    }
    if (dataToDisplay[loadingStringsFontAlignRightQueryIndex].is_valid == true) {
      // Use query_value here
      if (dataToDisplay[loadingStringsFontAlignRightQueryIndex].query_value == false) {
        loadingStringsFontAlignRight = LEFT;
      }
      if (dataToDisplay[loadingStringsFontAlignRightQueryIndex].query_value == true) {
        loadingStringsFontAlignRight = RIGHT;
      }
    }
  }
  if (loadingStringsFontAlignCenterQueryIndex >= 0) {
    if (dataToDisplay[loadingStringsFontAlignCenterQueryIndex].is_valid == false) {
      // Use default_value here
      loadingStringsFontAlignCenter = loadingStringsFontAlignRight;
    }
    if (dataToDisplay[loadingStringsFontAlignCenterQueryIndex].is_valid == true) {
      // Use query_value here
      if (dataToDisplay[loadingStringsFontAlignCenterQueryIndex].query_value == false) {
        loadingStringsFontAlignCenter = loadingStringsFontAlignRight;
      }
      if (dataToDisplay[loadingStringsFontAlignCenterQueryIndex].query_value == true) {
        loadingStringsFontAlignCenter = CENTER;
      }
    }
  }
  if (loadingStringsFontAlignBottomQueryIndex >= 0) {
    if (dataToDisplay[loadingStringsFontAlignBottomQueryIndex].is_valid == false) {
      // Use default_value here
      loadingStringsFontAlignBottom = TOP;
    }
    if (dataToDisplay[loadingStringsFontAlignBottomQueryIndex].is_valid == true) {
      // Use query_value here
      if (dataToDisplay[loadingStringsFontAlignBottomQueryIndex].query_value == false) {
        loadingStringsFontAlignBottom = TOP;
      }
      if (dataToDisplay[loadingStringsFontAlignBottomQueryIndex].query_value == true) {
        loadingStringsFontAlignBottom = BOTTOM;
      }
    }
  }

  displayLoadingStringsQueryIndex = dataToDisplay.findIndex(element => element.query_name == "display_loading_strings".toLowerCase());
  if (displayLoadingStringsQueryIndex >= 0) {
    if (dataToDisplay[displayLoadingStringsQueryIndex].is_valid == false) {
      // Use default_value here
      displayLoadingStrings = dataToDisplay[displayLoadingStringsQueryIndex].default_value;
    }
    if (dataToDisplay[displayLoadingStringsQueryIndex].is_valid == true) {
      // Use query_value here
      displayLoadingStrings = dataToDisplay[displayLoadingStringsQueryIndex].query_value;
    }
  }

  if (displayLoadingStrings == true) {
    textFont(font);
    recalculateFont(loadingStringsFontSize, loadingStringsFontStrokeWeight);
    if (loadingStringsFontSizeUseMultiplier == true) {
      textSize(textSizeToUse);
    }
    if (loadingStringsFontSizeUseMultiplier == false) {
      textSize(loadingStringsFontSize);
    }
    if (loadingStringsFontStrokeWeightUseMultiplier == true) {
      strokeWeight(fontStrokeWeight);
    }
    if (loadingStringsFontStrokeWeightUseMultiplier == false) {
      strokeWeight(loadingStringsFontStrokeWeight);
    }
    stroke("#000000FF");
    textAlign(loadingStringsFontAlignCenter, loadingStringsFontAlignBottom);
    fill("#FFFFFFFF");
    if (loadingStringsFontLeadingUseMultiplier == true) {
      textLeading(textDefaultLeadingToUse);
    }
    if (loadingStringsFontLeadingUseMultiplier == false) {
      textLeading(loadingStringsFontLeading);
    }
    text("Stream Starting Soon!!!\n\n" + loadingStringToBeDisplayed.loading_string + "\nSource: " + loadingStringToBeDisplayed.loading_strings_pack_name, loadingStringsXPos, loadingStringsYPos);
  }

  secondOld = secondCurrent;
}

function requestTwitchStreamStatus() {
  // Move the code below to a separate function, I just realized I'm programming this in draw(), and that it looks ugly lol (DONE)
  let channelIdQueryIndex = dataToDisplay.findIndex(element => element.query_name == "channel_id".toLowerCase());
  //let isAnyRequestedTwitchDataValid = false;
  //console.log("channelIdQueryIndex");
  //console.log(channelIdQueryIndex);
  //console.log("dataToDisplay[channelIdQueryIndex]");
  //console.log(dataToDisplay[channelIdQueryIndex]);
  if (channelIdQueryIndex >= 0) {
    if (dataToDisplay[channelIdQueryIndex].is_valid == true) {
      // Make sure index is not -1 before entering here (DONE)
      if (dataToDisplay[channelIdQueryIndex].query_value >= 0) {
        //console.log("IF WE ARE HERE, IT MEANS OUR CHANNEL ID IS VALID");
        let displayViewerCountQueryIndex = dataToDisplay.findIndex(element => element.query_name == "display_viewer_count".toLowerCase());
        let displayTwitchStreamUptimeQueryIndex = dataToDisplay.findIndex(element => element.query_name == "display_twitch_stream_uptime".toLowerCase());
        if (displayViewerCountQueryIndex >= 0) {
          if (dataToDisplay[displayViewerCountQueryIndex].is_valid == true) {
            // Make sure index is not -1 before entering here (DONE)
            if (dataToDisplay[displayViewerCountQueryIndex].query_value == true) {
              //console.log("IF WE ARE HERE, IT MEANS OUR display_viewer_count IS VALID");
              isAnyRequestedTwitchDataValid = true;
              isDisplayViewerCountValid = true;
            }
          }
        }
        if (displayTwitchStreamUptimeQueryIndex >= 0) {
          if (dataToDisplay[displayTwitchStreamUptimeQueryIndex].is_valid == true) {
            // Make sure index is not -1 before entering here (DONE)
            if (dataToDisplay[displayTwitchStreamUptimeQueryIndex].query_value == true) {
              //console.log("IF WE ARE HERE, IT MEANS OUR display_twitch_stream_uptime IS VALID");
              isAnyRequestedTwitchDataValid = true;
              isDisplayTwitchUptimeStreamValid = true;
            }
          }
        }
        if (isAnyRequestedTwitchDataValid == true) {
          // This check has to be at the end of the check that tells if channel id is valid, not outside (DONE)
          //console.log("isAnyRequestedTwitchDataValid = " + isAnyRequestedTwitchDataValid);
          socket.emit("request_twitch_stream_status", dataToDisplay[channelIdQueryIndex].query_value); // todo: make a modified version of getTwitchStreamStatus function that sends data directly to overlay instead of chat (DONE)
          //console.log("Multiple Of 5");
          //console.log("secondCurrent = " + secondCurrent + " and secondOld = " + secondOld);
        }
      }
    }
  }
}

function getRandomIntInclusive(min, max) {
  let minCeiled = Math.ceil(min);
  let maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); // The maximum is inclusive and the minimum is inclusive
}

function playAudio(audioStatus) {
  if (audioStatusGlobal == false) {
    return;
  }
  //console.log(new Date().toISOString() + " audioStatusGlobal = " + audioStatusGlobal);
  if (audioStatusGlobal == true) {
    if (sound.isLoaded() == false) {
      //audioStatusGlobal = true;
      //console.log(new Date().toISOString() + " File loading, please wait...");
    }
    if (sound.isLoaded() == true) {
      audioStatusGlobal = false;
      //console.log(new Date().toISOString() + " File successfully loaded!");
      sound.play();
    }
  }
}