import Pair from "crocks/Pair";
import prop from "crocks/Maybe/prop";
import {compose, pick } from "crocks/helpers";
import  { map, filter } from "crocks/pointfree";


const map2compose = (...fns) => map(map(compose(...fns)));
const hasMessages = pair => pair.snd().length > 0;

const extractMessages = compose(
  // Maybe(Array) -> Array
  maybe => maybe.option({}),
  // Object -> Maybe(Array)
  prop("messages")
);
const hasUnread = pair =>
  Number(pair.snd()[0].ts) > Number(pair.fst().last_read);
const unread = pair =>
  Pair(
    pair.fst(),
    pair
      .snd()
      .filter(message => Number(message.ts) > Number(pair.fst().last_read))
  );

export default authToken => {
  return ({
    transformConversations: compose(
      //[a] -> [a]
      filter(({ is_member, is_mpim, last_read }) => (is_member === true || is_mpim) && last_read)),
    fetchConversationHistory: conversations => Promise.all(conversations.map(({ id, name, last_read, is_mpim, is_private }) => getSlack("conversations.history", { channel: id, token: authToken })
      .then(JSON.parse)
      .then(response => Pair({ id, name, last_read, is_mpim, is_private }, response)))),
    // [Pair(state:Object, response:Object)] -> [Pair(state:Object, response:Object)]
    filterUnreadConversations: compose(map(unread), filter(hasUnread), filter(hasMessages), map2compose(filter(message => message.subtype !== "channel_join" &&
      message.subtype !== "group_archive"), extractMessages)),
    //[Pair(state:Object, response: Object)]
    foldConversationPairs: compose(conversations => {
      const isPrivate = pair => pair.is_private;
      const isMpim = pair => pair.is_mpim;
      const isPublic = pair => !isPrivate(pair) && !isMpim(pair);
      const pickNameAndMessage = pick(['name', 'messages']);
      return {
        public: conversations.filter(isPublic).map(pickNameAndMessage),
        private: conversations.filter(isPrivate).map(pickNameAndMessage),
        mpims: conversations.filter(isMpim).map(pickNameAndMessage)
      };
    }, mapMerge(({ name, is_mpim, is_private }, messages) => ({
      name,
      messages,
      is_mpim,
      is_private
    })))
  });
}