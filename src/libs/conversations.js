import Pair from "crocks/Pair";
import prop from "crocks/Maybe/prop";
import pick from "crocks/helpers/pick";
import compose from 'crocks/helpers/compose';
import { map, filter, merge } from "crocks/pointfree";

import { getSlack } from "./getSlack.js";

const unread = pair =>
  Pair(
    pair.fst(),
    pair
      .snd()
      .filter(message => Number(message.ts) > Number(pair.fst().last_read))
  );
//[a] -> [a]
export const filterConversations = filter(
  ({ is_member, is_mpim, last_read }) =>
    (is_member === true || is_mpim) && last_read
);

export const fetchConversationHistory = authToken => conversations =>
  Promise.all(
    conversations.map(({ id, name, last_read, is_mpim, is_private }) =>
      getSlack("conversations.history", { channel: id, token: authToken })
        .then(JSON.parse)
        .then(response =>
          Pair({ id, name, last_read, is_mpim, is_private }, response)
        )
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
        message.subtype !== "group_archive"
    ),
    extractMessages
  )
);
const mapMerge = fn => map(merge(fn));

//[Pair(state:Object, response: Object)]
export const foldConversationPairs = compose(
  conversations => {
    const isPrivate = conversation => conversation.is_private && !isMpim(conversation);
    const isMpim = conversation => conversation.is_mpim;
    const isPublic = conversation => !isPrivate(conversation) && !isMpim(conversation);
    const pickNameAndMessage = pick(["name", "messages"]);
    return {
      public: conversations.filter(isPublic).map(pickNameAndMessage),
      private: conversations.filter(isPrivate).map(pickNameAndMessage),
      mpims: conversations.filter(isMpim).map(pickNameAndMessage)
    };
  },
  mapMerge(({ name, is_mpim, is_private }, messages) => ({
    name,
    messages,
    is_mpim,
    is_private
  }))
);
