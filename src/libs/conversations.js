import Pair from "crocks/Pair";
import prop from "crocks/Maybe/prop";
import pick from "crocks/helpers/pick";
import compose from "crocks/helpers/compose";
import { map, filter, merge } from "crocks/pointfree";

import { getSlack } from "./getSlack.js";

const unread = pair =>
  Pair(
    pair.fst(),
    pair
      .snd()
      .filter(message => Number(message.ts) > Number(pair.fst().last_read))
  );
export const getConversationTimeStamps = authToken => conversations =>
  Promise.all(
    conversations.map(conversation => {
      if (conversation.last_read) {
        return Promise.resolve(conversation);
      }
      return getSlack("conversations.info", {
        channel: conversation.id,
        token: authToken
      }).then(JSON.parse).then(message => message.channel);
    })
  );


export const fetchConversationHistory = authToken => conversations =>
  Promise.all(
    conversations.map(({ id, name, last_read, is_private }) =>
      getSlack("conversations.history", { channel: id, token: authToken })
        .then(JSON.parse)
        .then(response => Pair({ id, name, last_read, is_private }, response))
    )
  );

const hasUnread = pair =>
  Number(pair.snd()[0].ts) > Number(pair.fst().last_read);
const hasMessages = pair => pair.snd().length > 0;

const extractMessages = compose(
  // Maybe(Array) -> Array
  maybe => maybe.option({}),
  // Object -> Maybe(Array)
  prop("messages")
);
const map2compose = (...fns) => map(map(compose(...fns)));

// [Pair(state:Object, response:Object)] -> [Pair(state:Object, response:Object)]
export const filterUnreadConversations = compose(
  map(unread),
  filter(hasUnread),
  filter(hasMessages),
  map2compose(
    filter(
      message =>
        message.subtype !== "channel_join" &&
        message.subtype !== "group_archive" &&
        message.subtype !== "channel_leave"
    ),
    extractMessages
  )
);
const mapMerge = fn => map(merge(fn));

//[Pair(state:Object, response: Object)]
export const foldConversationPairs = compose(
  conversations => {
    const isPrivate = conversation => conversation.is_private;
    const isPublic = conversation => !isPrivate(conversation);
    const pickNameAndMessage = pick(["name", "messages"]);
    return {
      public: conversations.filter(isPublic).map(pickNameAndMessage),
      private: conversations.filter(isPrivate).map(pickNameAndMessage)
    };
  },
  mapMerge(({ name, is_private }, messages) => ({
    name,
    messages,
    is_private
  }))
);

//[Pair(state:Object, response: Object)]
export const foldMpimsPairs = mapMerge(({ name }, messages) => ({
  name,
  messages
}));
