import {
  filterConversations,
  fetchConversationHistory,
  filterUnreadConversations,
  foldConversationPairs
} from "./libs/conversations.js";
import {
  fetchImHistory,
  filterUnreadIms,
  fetchImUser,
  foldImPairs
} from "./libs/ims.js";
import { getSlack } from "./libs/getSlack.js";

const isIm = ({ is_im }) => is_im;
const isNotIm = (...args) => !isIm(...args);

// main
// ({ authToken }) -> Promise({ ims, mpims, public, private })
export default ({ authToken }) =>
  Promise.all([
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
        .then(filterConversations)
        .then(fetchConversationHistory(authToken))
        .then(filterUnreadConversations)
        .then(foldConversationPairs);
      const unreadIms = Promise.resolve(ims)
        .then(fetchImHistory(authToken))
        .then(filterUnreadIms)
        .then(fetchImUser(authToken))
        .then(foldImPairs);
      return Promise.all([unreadConversations, unreadIms]);
    })
    .then(([conversations, ims]) => {
      return {
        ...conversations,
        ims
      };
    });

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
