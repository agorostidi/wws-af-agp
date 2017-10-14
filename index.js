"use strict";
// --------------------------------------------------------------------------
// Require statements
// --------------------------------------------------------------------------
var express = require("express");
var bodyParser = require("body-parser");
var request = require("request");
var requestjs = require("request-json");
var crypto = require("crypto");

var APP_ID = "2313???";
var APP_SECRET = "9wxu???";
var APP_WEBHOOK_SECRET = "n8zf???";
var SPACE_ID = "5819???";

// --------------------------------------------------------------------------
// Setup global variables
// --------------------------------------------------------------------------
var textBreakGQL = "\\r\\n";
var textBreak = "\r\n";

// Workspace API Setup - fixed stuff
const WWS_URL = "https://api.watsonwork.ibm.com";
const AUTHORIZATION_API = "/oauth/token";
const OAUTH_ENDPOINT = "/oauth/authorize";
const WEBHOOK_VERIFICATION_TOKEN_HEADER = "X-OUTBOUND-TOKEN".toLowerCase();

// --------------------------------------------------------------------------
// Setup the express server
// --------------------------------------------------------------------------
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + "/public"));

// create application/json parser
var jsonParser = bodyParser.json();

// --------------------------------------------------------------------------
// Express Server runtime
// --------------------------------------------------------------------------
// Start our server !
app.listen(process.env.PORT || 3000, function() {
    console.log("INFO: app is listening on port %s", (process.env.PORT || 3000));
});

// --------------------------------------------------------------------------
// Webhook entry point
app.post("/callback", jsonParser, function(req, res) {
    // Check if we have all the required variables
    if (!APP_ID || !APP_SECRET || !APP_WEBHOOK_SECRET) {
        console.log("ERROR: Missing variables APP_ID, APP_SECRET or WEBHOOK_SECRET from environment");
        return;
    }

    // Handle Watson Work Webhook verification challenge
    if (req.body.type === 'verification') {
        console.log('Got Webhook verification challenge ' + JSON.stringify(req.body));

        var bodyToSend = {
            response: req.body.challenge
        };

        var hashToSend = crypto.createHmac('sha256', APP_WEBHOOK_SECRET).update(JSON.stringify(bodyToSend)).digest('hex');

        res.set('X-OUTBOUND-TOKEN', hashToSend);
        res.send(bodyToSend);
        return;
    }

    console.log("userId =", req.body.userId);

    // Ignore all our own messages
    if (req.body.userId === APP_ID) {
        console.log("Message from myself : abort");
        res.status(200).end();
        return;
    }

    // Ignore empty messages
    if (req.body.content === "") {
        console.log("Empty message : abort");
        res.status(200).end();
        return;
    }

    // Get the event type
    var eventType = req.body.type;

    // Get the spaceId
    var spaceId = req.body.spaceId;

    // Acknowledge we received and processed notification to avoid getting
    // sent the same event again
    res.status(200).end();

    // Act only on the events we need
    if (eventType === "message-annotation-added") {

      // Action fulfillment callback - When user clicks and engages with App
      if (annotationType === "actionSelected") {
  	  var userName = req.body.userName;
        console.log("------- AF -------------------------------")
        console.log("%s clicked on an action link.", userName);

        // Extract the necessary info
        var targetUserId = req.body.userId;
        var conversationId = annotationPayload.conversationId;
        var targetDialogId = annotationPayload.targetDialogId;
        var referralMessageId = annotationPayload.referralMessageId;
        var actionId = annotationPayload.actionId;
        console.log("Action : %s", actionId);
        console.log("Referral Message Id : %s", referralMessageId);

        var gqlmessage = "query getMessage {message(id: \"" + referralMessageId + "\") {annotations}}";
  	    // First click on underlined message
        if (actionId === "Get_Demo_Assets") {
  		      // We first need to get back the annotations of the originating message to get the possible search terms.
            getAuthFromAppIdSecret(APP_ID, APP_SECRET, function(error, accessToken) {
              if (error) {
                console.log("Unable to authenticate. No results will be shown.");
              } else {
                callGraphQL(accessToken, gqlmessage, function(error, bodyParsed, accessToken) {
                  if (!error) {
                    var msgannotations = bodyParsed.data.message.annotations;

                    // Loop over all the annotations and get the one we need
                    for (var i = 0; i < msgannotations.length; i++) {
                      var ann = JSON.parse(msgannotations[i]);

                      // React on message-focus to catch the expert query
                      if (ann.type === "message-focus") {
                        // Get the lens of the focus
                        var lens = ann.lens;

                        // Only react on lens 'demo-asset'
                        if (lens === "demo-asset") {
                          console.log("Received Demo Asset Query : " + ann.phrase);

                          var confidence = ann.confidence;
                          var extractedInfo = ann.extractedInfo;
  					              var entities = extractedInfo.entities;
  					              var arrayLength = entities.length;
  					              var product = "";
  					              for (var j = 0; j < arrayLength; j++) {
                            if (entities[j].type === "product"){
                              product = entities[j].text;
                            }
                          }

  					              // Preparing the dialog message
                          var afgraphql1 = "mutation {createTargetedMessage(input: {conversationId: \"" + conversationId + "\" targetUserId: \"" + targetUserId + "\" targetDialogId: \"" + targetDialogId + "\" attachments: [";
                          var afgraphql3 = "]}){successful}}";
                          var afgraphql2 = "";
                          var cardtitle = "";
                          var cardtext = "";
                          var buttontext = "SHARE";
                          var buttonpayload = "SHARE-";

                          if (product === "IBM Verse"){
                            for (var i = 0; i < 5; i++) {
                              if (i == 0) {
                                cardtitle = "IBM Verse Video Demos";
                                cardtext = "Are you looking for IBM Verse video, here is right place to go. Basic and Administration Videos Available for you.";
                                buttonpayload += "VERSE-00";
                                afgraphql2 += "{type:CARD, cardInput:{type:INFORMATION, informationCardInput: {title: \"" + cardtitle + "\", text: \"" + cardtext + "\",buttons: [{text: \"" + buttontext + "\", payload: \"" + buttonpayload + "\", style: PRIMARY}]}}}";
                              }
                              else {
                                afgraphql2 += ",";
                                if (i==1){
                  								cardtitle = "IBM Verse Conversation Guide";
                  								cardtext = "This asset will help you to be prepared for a Conversation with a Customer.";
                  								buttonpayload += "VERSE-01";
                  								afgraphql2 += "{type:CARD, cardInput:{type:INFORMATION, informationCardInput: {title: \"" + cardtitle + "\", text: \"" + cardtext + "\",buttons: [{text: \"" + buttontext + "\", payload: \"" + buttonpayload + "\", style: PRIMARY}]}}}";
                                } else if (i==2) {
                                  cardtitle = "IBM Verse Visualization Assets";
                                  cardtext = "Visit this page to see a list of amazing IBM Verse Click-through Demos using InVision.";
                                  buttonpayload += "VERSE-02";
                                  afgraphql2 += "{type:CARD, cardInput:{type:INFORMATION, informationCardInput: {title: \"" + cardtitle + "\", text: \"" + cardtext + "\",buttons: [{text: \"" + buttontext + "\", payload: \"" + buttonpayload + "\", style: PRIMARY}]}}}";
                                } else if (i==3) {
                                  cardtitle = "IBM Verse Live Environment";
                                  cardtext = "Are you looking for Live Environment to deliver an IBM Verse Demo. In this wiki page you will learn how to request a demo environment.";
                                  buttonpayload += "VERSE-03";
                                  afgraphql2 += "{type:CARD, cardInput:{type:INFORMATION, informationCardInput: {title: \"" + cardtitle + "\", text: \"" + cardtext + "\",buttons: [{text: \"" + buttontext + "\", payload: \"" + buttonpayload + "\", style: PRIMARY}]}}}";
                                } else if (i==4) {
                                  cardtitle = "IBM Verse Client Presentation";
                                  cardtext = "Do you need an IBM Verse Presentation for a Customer Meeting? Here is the right place to see different type of presentations";
                                  buttonpayload += "VERSE-04";
                                  afgraphql2 += "{type:CARD, cardInput:{type:INFORMATION, informationCardInput: {title: \"" + cardtitle + "\", text: \"" + cardtext + "\",buttons: [{text: \"" + buttontext + "\", payload: \"" + buttonpayload + "\", style: PRIMARY}]}}}";
                                }
                              }
                            }
                            var afgraphql = afgraphql1 + afgraphql2 + afgraphql3;
                            postActionFulfillmentMessage(accessToken, afgraphql, function(err, accessToken) {});
                          }
                        }
                      }
                    }
                  }
                })
              }
            })
          }
          if (actionId.startsWith("SHARE")) {
             // Get the searchwords from the actionId
             var cardID = actionId.slice(6, actionId.length);
             console.log("AF received SHARE for : ", cardID);

             afShare(conversationId, targetUserId, targetDialogId, spaceId, cardID);
          }
        }
        return;
    }

    if (eventType === "message-created") {
        console.log("Message Created received.");

        //Check if the first 8 letters form the string '@echobot'.
        //This lets us "listen" for the '@echobot' keyword
        if (req.body.content.substring(0, 8) === "@echobot") {

            // slice off the '@echobot' part.
            var term = req.body.content.slice(9, req.body.content.length);
            console.log("Echobot received", term);

            // Post it back to the space
            // Let's try to authenticate
            getJWTToken(APP_ID, APP_SECRET, function(jwt) {
                console.log("JWT Token :", jwt);
                // And post it back
                postMessageToSpace(spaceId, jwt, term, function(success) {
                    return;
                })
            })

        }
        return;
    }

    // We don't do anything else, so return.
    console.log("INFO: Skipping unwanted eventType: " + eventType);
    return;
});



// --------------------------------------------------------------------------
// REST API test : listen for POST requests on /test-message, parse the incoming JSON
app.post("/test-message", jsonParser, function(req, res) {
    console.log(req.body);

    // Build your name from the incoming JSON
    var myMsg = req.body.fname + " " + req.body.lname;

    // Let's try to authenticate
    getJWTToken(APP_ID, APP_SECRET, function(jwt) {
        console.log("JWT Token :", jwt);
        postMessageToSpace(SPACE_ID, jwt, myMsg, function(success) {
            if (success) {
                res.status(200).end();
            } else {
                res.status(500).end();
            }
        })
    })

});

// ------------------------------------------
// SHARE
// ------------------------------------------
function afShare(conversationId, targetUserId, targetDialogId, spaceId, cardID) {
    // Preparing the dialog message
    var demoName = "";
    var demoDescription = "";
    
    if (cardId==="VERSE-00"){
      demoName = "IBM Verse Video Demos";
      demoDescription = "Are you looking for IBM Verse video, here is right place to go. Basic and Administration Videos Available for you.";
    } else if  (cardId==="VERSE-01"){
      demoName = "IBM Verse Conversation Guide";
      demoDescription = "This asset will help you to be prepared for a Conversation with a Customer.";
    } else if  (cardId==="VERSE-02"){
      demoName = "IBM Verse Visualization Assets";
      demoDescription = "Visit this page to see a list of amazing IBM Verse Click-through Demos using InVision.";
    } else if  (cardId==="VERSE-03"){
      demoName = "IBM Verse Live Environment";
      demoDescription = "Are you looking for Live Environment to deliver an IBM Verse Demo. In this wiki page you will learn how to request a demo environment.";
    } else if  (cardId==="VERSE-04"){
      demoName = "IBM Verse Client Presentation";
      demoDescription = "Do you need an IBM Verse Presentation for a Customer Meeting? Here is the right place to see different type of presentations";
    }
    var afgraphql1 = "mutation {createTargetedMessage(input: {conversationId: \"" + conversationId + "\" targetUserId: \"" + targetUserId + "\" targetDialogId: \"" + targetDialogId + "\" annotations: [{genericAnnotation: {title: \"Shared demo asset details !\" text: \"I've shared the details of the demo asset - " + demoName + " - with the space.\" buttons: [";
    var afgraphql2 = "]}}]}){successful}}";

    var afgraphql = afgraphql1 + afgraphql2;

    // preparing the share message
    var messageName = "You requested details about demo asset ";

    var demomessage = "Here are the details : " + textBreak;
    demomessage += "*Asset* : " + demoName + textBreak;
    demomessage += "*Description* : " + demoDescription + textBreak;

    var messageTitle = "";
    if (cardId..startsWith("VERSE")){
      messageTitle = "IBM Verse Assets"
    }

    // Send the dialog message
    getAuthFromAppIdSecret(APP_ID, APP_SECRET, function(error, accessToken) {
      if (error) {
        console.log("Unable to authenticate. No results will be shown.");
      } else {
        // Building the message to send to the space.
        var messageData = {
          type: "appMessage",
          version: 1.0,
          annotations: [
            {
              type: "generic",
              version: 1.0,
              color: "#0543D5",
              title: messageTitle,
              text: demomessage,
              actor: {
                name: messageName,
                avatar: "",
                url: ""
              }
            }
          ]
        };

        postCustomMessageToSpace(accessToken, spaceId, messageData, function(err, accessToken) {
          if (err) {
            console.log("Unable to post custom message to space. No demo asset shared.");
          }
        });

        postActionFulfillmentMessage(accessToken, afgraphql, function(err, accessToken) {});
      };
    });
  });
}

//--------------------------------------------------------------------------
//Post a custom message to a space
function postCustomMessageToSpace(accessToken, spaceId, messageData, callback) {
  var jsonClient = requestjs.createClient(WWS_URL);
  var urlToPostMessage = "/v1/spaces/" + spaceId + "/messages";
  jsonClient.headers.jwt = accessToken;

  // Calling IWW API to post message
  jsonClient.post(urlToPostMessage, messageData, function(err, jsonRes, jsonBody) {
    if (jsonRes.statusCode === 201) {
      console.log("Message posted to IBM Watson Workspace successfully!");
      callback(null, accessToken);
    } else {
      console.log("Error posting to IBM Watson Workspace !");
      console.log("Return code : " + jsonRes.statusCode);
      console.log(jsonBody);
      callback(err, accessToken);
    }
  });
}

//--------------------------------------------------------------------------
//Post an AF message to a space
function postActionFulfillmentMessage(accessToken, afgraphql, callback) {
  // Build the GraphQL request
  const GraphQLOptions = {
    "url": `${WWS_URL}/graphql`,
    "headers": {
      "Content-Type": "application/graphql",
      "x-graphql-view": "PUBLIC, BETA",
      "jwt": "${jwt}"
    },
    "method": "POST",
    "body": ""
  };

  GraphQLOptions.headers.jwt = accessToken;
  GraphQLOptions.body = afgraphql;

  //console.log(GraphQLOptions.body);
  request(GraphQLOptions, function(err, response, graphqlbody) {
    //console.log(graphqlbody);

    if (!err && response.statusCode === 200) {

      var bodyParsed = JSON.parse(graphqlbody);
      callback(null, accessToken);
    } else if (response.statusCode !== 200) {
      console.log("ERROR: didn't receive 200 OK status, but :" + response.statusCode);
      var error = new Error("");
      callback(error, null, accessToken);
    } else {
      console.log("ERROR: Can't retrieve " + GraphQLOptions.body + " status:" + response.statusCode);
      callback(err, accessToken);
    }
  });
}

function callGraphQL(accessToken, graphQLbody, callback) {
  // Build the GraphQL request
  const GraphQLOptions = {
    "url": `${WWS_URL}/graphql`,
    "headers": {
      "Content-Type": "application/graphql",
      "x-graphql-view": "PUBLIC",
      "jwt": accessToken
    },
    "method": "POST",
    "body": ""
  };

  GraphQLOptions.headers.jwt = accessToken;
  GraphQLOptions.body = graphQLbody;

  // Create the space
  request(GraphQLOptions, function(err, response, graphqlbody) {
    if (!err && response.statusCode === 200) {
      //console.log(graphqlbody);
      var bodyParsed = JSON.parse(graphqlbody);
      callback(null, bodyParsed, accessToken);
    } else if (response.statusCode !== 200) {
      console.log("ERROR: didn't receive 200 OK status, but :" + response.statusCode);
      var error = new Error("");
      callback(error, null, accessToken);
    } else {
      console.log("ERROR: Can't retrieve " + GraphQLOptions.body + " status:" + response.statusCode);
      var error = new Error("");
      callback(error, null, accessToken);
    }
  });
}



//--------------------------------------------------------------------------
//Get an authentication token
function getJWTToken(userid, password, callback) {
    // Build request options for authentication.
    const authenticationOptions = {
        "method": "POST",
        "url": `${WWS_URL}${AUTHORIZATION_API}`,
        "auth": {
            "user": userid,
            "pass": password
        },
        "form": {
            "grant_type": "client_credentials"
        }
    };

    // Get the JWT Token
    request(authenticationOptions, function(err, response, authenticationBody) {

        // If successful authentication, a 200 response code is returned
        if (response.statusCode !== 200) {
            // if our app can't authenticate then it must have been
            // disabled. Just return
            console.log("ERROR: App can't authenticate");
            callback(null);
        }
        const accessToken = JSON.parse(authenticationBody).access_token;
        callback(accessToken);
    });
}

//--------------------------------------------------------------------------
//Post a message to a space
function postMessageToSpace(spaceId, accessToken, textMsg, callback) {
    var jsonClient = requestjs.createClient(WWS_URL);
    var urlToPostMessage = "/v1/spaces/" + spaceId + "/messages";
    jsonClient.headers.jwt = accessToken;

    var title = "";
    if (textMsg.substring(0, 10) === "It appears"){
        	title="I was listening and...";
    } else {
        	title="I was listening and you said ...";
    }

    // Building the message
    var messageData = {
        type: "appMessage",
        version: 1.0,
        annotations: [
            {
                type: "generic",
                version: 1.0,
                color: "#00B6CB",
                title: title,
                text: textMsg,
                actor: {
                    name: "Echobot",
                    avatar: "",
                    url: ""
                }
            }
        ]
    };

    // Calling IWW API to post message
    console.log("Message body : %s", JSON.stringify(messageData));

    jsonClient.post(urlToPostMessage, messageData, function(err, jsonRes, jsonBody) {
        if (jsonRes.statusCode === 201) {
            console.log("Message posted to IBM Watson Workspace successfully!");
            callback(true);
        } else {
            console.log("Error posting to IBM Watson Workspace !");
            console.log("Return code : " + jsonRes.statusCode);
            console.log(jsonBody);
            callback(false);
        }
    });

}
