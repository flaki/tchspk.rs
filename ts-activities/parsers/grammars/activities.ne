@include "_helpers.ne"


# Default main branch
main -> not_finalized:? ( speakers | speakers "'s" | speakers " is" ) (" " activities):? " " where {%
  ([ notFinal, [participants], activities, _, [event] ]) => Object.assign(
    { status: notFinal ? 'pending' : 'active' },
    { participants, event },
    //{ act: activities },
    collect_in_depth('activities', activities),
    collect_in_depth('topics', activities),
  )
%}


# Talk should not show up in listings as some of its details are not confirmed yet
not_finalized -> "?" " "

# Speaker lists can be speaker names separated with a comma, optionally having
# the last speaker (or second, in case of only two) speaker separated with "&"
speakers -> techspeaker ( ", " techspeaker ):* ( " & " techspeaker ):? {%
  ([ first, next, last ]) => [first].concat(
    next.map(s => s[1]), // adds the comma separated names
    last ? [last.pop()] :[] // adds the "& foo" speaker, if one was specified
  )
%}

# Load TechSpeaker names from separate grammar file
@include "../compiled/techspeakers.ne"



# Activities

# Allow multiple activities & roles per event
activities -> ( activity_role "/" activity_role | activity_role " & " activity_role | activity_role ) {%
  ([d]) => Object.assign({}, collect_in_depth('activities',d), collect_in_depth('topics',d)) %}

# Guess role from format
@{%
  const role_from_format = function(format) {
    switch (format) {
      case 'keynote':
      case 'talk':      return 'speaker'
      case 'workshop':  return 'facilitator'
    }
    return ''
  }
%}

# Activities without verb (e.g. Xy's workshop)
activities -> ( activity " & " activity | activity ) {%
  ([d]) => {
    let act = find_objects_with('activity_type', d).map(
      a => {
        const format = String(a.activity_type||'').toLowerCase()
        const role = role_from_format(format)

        return ({
          activities: [{
            verb: '',
            role: role,
            format: format,
          }],
          topics: a.topics || []
        })
      }
    )

    return Object.assign({},
      collect_in_depth('activities',act),
      collect_in_depth('topics',act),
    )
  }
  %}



@{%
  const activity_role_as = (role, activity, details) => Object.assign(
    {
      activities: [{ verb: activity.toLowerCase(), role, format: String(details&&details.activity_type||'').toLowerCase() }],
    },
    collect_in_depth('topics',[details]),
  )
%}

# Speaking at an event on various topics
activity_role -> ( "speak"i | "talk"i | "present"i | "co-present"i | "demo"i ) ing_form ( ( " on"i | " about"i ):? " " topics):? {%
  ([ [activity], _1, topics ]) => Object.assign(
    {
      activities: [{ verb: activity.toLowerCase(), role: 'speaker', format: '' }],
    },
    collect_in_depth('topics',topics),
  ) %}

# Conducting an event (e.g. workshop)
activity_role -> ( "conducting"i | "giving"i | "leading"i | "hosting"i | "holding"i | "running"i | "mentoring"i | "delivering"i | "workshopping"i ) optional_activity {%
  ([ [activity], details ]) => activity_role_as('facilitator', activity, details)
%}

# Organizing an event (e.g. meetup)
activity_role -> ( "organizing"i | "helping organize"i | "co-organizing"i | "helping co-organize"i | "organizer of"i | "facilitating"i | "workshop lead"i ) optional_activity {%
  ([ [activity], details ]) => activity_role_as('organizer', activity, details)
%}

# Creating content (e.g. podcast)
activity_role -> ( "recording" | "creating" ) optional_activity {%
  ([ [activity], details ]) => activity_role_as('creator', activity, details)
%}

# Attending event
activity_role -> ( "attending"i | "participating"i ) optional_activity {%
  ([ [activity], details ]) => activity_role_as('attend', activity, details)
%}

# Emceeing (Master of Ceremony / host)
activity_role -> ( "mcing"i | "mc'ing"i | "mc-ing"i ) {%
  ([ [activity] ]) => activity_role_as('mc', activity)
%}

# Keynote speech / high-profile opening/closing talk
activity_role -> ( "keynoting"i | "opening"i | "closing"i ) {%
  ([ [activity] ]) => activity_role_as('speaker', activity)
%}

optional_activity -> (" " activity | null) {% ([[_2, activity]]) => activity || {} %}


# Activity with no topics associated with it
activity -> optional_a_an activity_type {%
  ([ _, [activity_type] ]) => Object.assign({ activity_type }) %}

# Activity with associated topics
activity -> optional_a_an activity_type ( " on " | " about " | " with " ) topics {%
  ([ _1, [activity_type], _2, topics ]) => Object.assign({ activity_type }, topics) %}

# Activity with associated topics and format (e.g. a hosting a WebVR workshop)
activity -> optional_a_an topics " " activity_type {%
  ([ _1, topics, _2, [activity_type] ]) => Object.assign({ activity_type }, topics) %}

# E.g. TechSpeaker organizing #MozSprint
activity -> hashtag {%
  ([ topic ]) => Object.assign({ topics: [ topic ] }) %}

activity_type -> ( "talk"i | "lightning talk"i | "presentation"i | "workshop"i | "hackathon"i | "sprint"i | "meetup"i ) {% ([[format]]) => [format.toLowerCase()] %}
activity_type -> ( hashtag " " ):? "booth"i
activity_type -> ( "the "i | null ) ( "opening "i | "closing "i | null ) "keynote"i {% () => ['keynote'] %}
activity_type -> ( "in "i | "in a "i | null ) "panel"i " discussion"i:?
activity_type -> "video series"i
activity_type -> "podcast"i | "interview"i

activity_type -> "workshop #"i [0-9]:+ {% () => ['workshop'] %}
#activity_type -> [ a-zA-Z#-]:+


# Topics
topic -> "the " topic {% ([_, d]) => d %} # discard the "the"
topic -> hashtag | twitter_handle

topic -> "Mozilla"i | "TechSpeakers"i | "Tech Speakers" | "ET" | "Emerging Technologies"i
topic -> "Firefox"i | "Firefox Quantum"i | "Developer Tools"i | "DevTools"i | "Dev Tools"i | "Nightly"
topic -> ( "Web"i:? " ":? "Extension"i "s":? ) {% joiner %}
topic -> "Addons"i | "Add-ons"
topic -> "WebCompat"i | "Web Compat"i | "Localization"i | "L10n"i | "I18n"i | "Accessibility"i | "a11y"i
topic -> "CommonVoice"i | "Common Voice"i | "AV1" | "Test Pilot"
topic -> "WebRTC"i
topic -> "IoT"i | "Internet of Things"i | "Project Things"i | "Web of Things"
topic -> "CSS" | "CSS Grid"i | "CSS Layout"i "s":? {% ([d]) => [d]%}
topic -> "JS"i | "JavaScript"i | "Node.js"i
topic -> "Rust"i | "Servo" | "WASM"i | "WebAssembly"i | "assembly"i
topic -> "vue.js"i | "react"i | "angular" | "elm"
topic -> ("Web"i:? " ":? ( "VR"i | "AR"i | "XR"i | "MR"i ) ) {% joiner %}
topic -> "A-frame"i | "Aframe"i | "mixed reality"i
topic -> "PWA" "s":? {% ([d]) => [d]%}
topic -> "Progressive Web Apps"i | "Progressive WebApps"i
topic -> "Open Source"i | "Open Web"i | "Data Encryption"i | "security"i | "privacy"i | "decentralization"i
topic -> ( "Web"i:? " ":? "Literacy"i ) {% joiner %}
topic -> "WordPress"i | "community"i | "communities"i | "community building"i | "copyright"i
topic -> "design"i | "open design"i | "SVG"
topic -> "learning to code"i | "teaching code"i
topic -> "Public Speaking"i | "CFP"
topic -> "Diversity"i | "Inclusion"i | "D&I" | "Women In Tech"i
topic -> "OS Project management"
topic -> "Project"i "s":? {% joiner %}

# Old but gold
topic -> "Firefox OS" | "FxOS" | "Connected Devices"i


# Creates a new {} with the property "topics", with all topics as strings listed
# in an array. Topics are any topics separated by "topic_separator" strings.
topics -> topic ( topic_separator topic ):* {%
  ([t, rest]) => ({ topics: [ ...t, ...rest.map( ([_, [t]]) => t ) ] }) %}

topic_separator -> ( " " | ", " | "/" | " / " | " & " | " and " ) {% _ => null %}

# Free-text (non-preset) topics are deprecated - you can use #Hashtag topics or
# twitter_handle-s for specific, non-preset freetext topics
#topic -> [a-zA-Z0-9#"'.-]:+


# Event names are fairly unrestricted, thus they will need more post-processing to be useful
# (e.g. to be correlated between users and platforms, e.g. CFP bot data)
where ->  ( "@" | "at" | "in" | "for" ) " " event {% ([ _1, _2, event ]) => event %}

event -> multi_word_text


# Natural language prepositions (e.g. someone giving >a< workshop)
a_an_form -> "a" | "an"
optional_a_an -> null | "a " | "an "

# Present-continuous form for generating various permutations of verbs (e.g. talk -> talks -> talking)
ing_form -> null | "s" | "ing" {% _ => null %}

# Twitter-style unique ID, twitter/github/telegram etc. handle
twitter_handle -> "@" [a-zA-Z0-9_]:+ {% ([at,tag]) => at+tag.join('') %}

# Tag (hashtag) form
hashtag -> "#" [a-zA-Z0-9_]:+ {% ([hash,tag]) => hash+tag.join('') %}

# Multi-word text that could include punctuation and foreign accents (e.g. venue names, event names, etc.)
multi_word_text -> [ áÁàÀâÂäÄãÃåÅæÆçÇéÉèÈêÊëËíÍìÌîÎïÏłŁñÑóÓòÒôÔöÖõÕøØœŒßșȘúÚùÙûÛüÜa-zA-Z0-9@&\[\]()|!/#:"'\.\+,-]:+ {% ([name]) => name.join('') %}
