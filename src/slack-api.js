import {
  filterConversations,
  fetchConversationHistory,
  filterUnreadConversations,
  foldConversationPairs,
  foldMpimsPairs,
  getConversationTimeStamps
} from "./libs/conversations.js";
import {
  fetchImHistory,
  filterUnreadIms,
  fetchImUser,
  foldImPairs
} from "./libs/ims.js";
import { getSlack } from "./libs/getSlack.js";
import {filter} from "crocks/pointfree";
const isIm = ({ is_im }) => is_im;
const isNotIm = (...args) => !isIm(...args);

// main
// ({ authToken }) -> Promise({ ims, mpims, public, private })
export default ({ authToken }) =>
  Promise.all([
    getAllConvos({ types: "private_channel,public_channel", token: authToken }),
    getAllConvos({ types: "im,mpim", token: authToken })
  ])
    .then(([conversations, dms]) => {
      const mpims = dms.filter(isNotIm);
      const ims = dms.filter(isIm);
      return [conversations, mpims, ims];
    })
    .then(([conversations, mpims, ims]) => {
      const unreadConversations = Promise.resolve(conversations)
                                  .then(filter(({ is_member }) => is_member))
                                  .then(getConversationTimeStamps(authToken))
                                  .then(filter(({ last_read }) => last_read))
                                  .then(fetchConversationHistory(authToken))
                                  .then(filterUnreadConversations)
                                  .then(foldConversationPairs);
      const unreadMpims = Promise.resolve(mpims)
                            .then(filter(({ is_member, last_read }) => (is_member && last_read)))
                            .then(fetchConversationHistory(authToken))
                            .then(filterUnreadConversations)
                            .then(foldMpimsPairs);
      const unreadIms = Promise.resolve(ims)
        .then(fetchImHistory(authToken))
        .then(filterUnreadIms)
        .then(fetchImUser(authToken))
        .then(foldImPairs);
      return Promise.all([unreadConversations, unreadIms, unreadMpims]);
    })
    .then(([conversations, ims, mpims]) => {
      return {
        ...conversations,
        ims,
        mpims,
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
