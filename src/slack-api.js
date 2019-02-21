"use strict";
import querystring from "querystring";
import requestPromise from "request-promise";
import conversationHelpers from './libs/conversations';
import imHelpers from './libs/ims';

const isIm = ({ is_im }) => is_im;
const isNotIm = (...args) => !isIm(...args);

// main
// () -> Promise([Pair(Object, Object)])
export default function unreadSlack({authToken})  {
  const {transformConversations, fetchConversationHistory, filterUnreadConversations, foldConversationPairs} = conversationHelpers(authToken);
  const {fetchImHistory, filterUnreadIms, fetchImUser, foldImPairs} = imHelpers(authToken);

  return Promise.all([
    getAllConvos({ types: "private_channel,public_channel", token: authToken }),
    getAllConvos({ types: "im,mpim", token: authToken })
  ])
  .then(([channels, dms]) => {
    const conversations = [...channels, ...dms.filter(isNotIm)];
    const ims = dms.filter(isIm);
    return [conversations, ims];
  })
  .then(([conversations, ims]) => {
    const unreadConversations = Promise.resolve(conversations)
                                  .then(transformConversations)
                                  .then(fetchConversationHistory)
                                  .then(filterUnreadConversations)
                                  .then(foldConversationPairs)
    const unreadIms = Promise.resolve(ims)
                        .then(fetchImHistory)
                        .then(filterUnreadIms)
                        .then(fetchImUser)
                        .then(foldImPairs)
    return Promise.all([unreadConversations, unreadIms]);
  })
  .then(([conversations, ims]) => {
    return {
      ...conversations,
      ims
    }
  })
}

// helpers
const getSlack = (path = "", qs = {}) => {
  const params = querystring.stringify(qs);
  return requestPromise(`https://slack.com/api/${path}?${params}`);
};

const getAllConvos = ({ limit = 1000, types, token } = {}) => {
  async function getConvoById(cursor, convos) {
    const response = await getSlack("conversations.list", {
      limit,
      types,
      cursor,
      token
    });

    const processed = JSON.parse(response);
    const newConvos = convos.concat(processed.channels);

    if (
      processed.response_metadata &&
      processed.response_metadata.next_cursor.trim()
    ) {
      return getConvoById(response.response_metadata.next_cursor, newConvos);
    } else {
      return newConvos;
    }
  }

  return getConvoById(null, []);
};

