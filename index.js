"use strict";
// --------------------------------------------------------------------------
// Require statements
// --------------------------------------------------------------------------
var express = require("express");
var bodyParser = require("body-parser");
var request = require("request");
var requestjs = require("request-json");
var crypto = require("crypto");
//var moment = require('moment');

var APP_ID = "37??";
var APP_SECRET = "uC??";
var APP_WEBHOOK_SECRET = "7v??";
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
        // Message Annotation Added Code Here

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
function afShare(conversationId, targetUserId, targetDialogId, spaceId, cardId) {
    // AFShare Code Here

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
      console.log("Status code === 200");
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
