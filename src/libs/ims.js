import { compose } from "crocks/helpers";
import { map, filter, merge } from "crocks/pointfree";
import { getSlack } from "./getSlack.js";
import Pair from "crocks/Pair";

export const fetchImHistory = authToken => ims =>
  Promise.all(
    ims.map(({ id }) =>
      getSlack("im.history", { channel: id, token: authToken, unreads: true }).then(JSON.parse)
    )
  );

export const extractUnreadIms = response =>
  response.messages.slice(0, response.unread_count_display);

const hasUnreadIms = response =>
  response.unread_count_display && response.unread_count_display > 0;

// [response:Object] -> [response:Object]
export const filterUnreadIms = compose(
  map(extractUnreadIms),
  filter(hasUnreadIms)
);
export const fetchImUser = authToken => unreadIms =>
  Promise.all(
    unreadIms.map(messages =>
      getSlack("users.info", { user: messages[0].user, token: authToken })
        .then(JSON.parse)
        .then(response => Pair(response.user.name, messages))
    )
  ).catch(error => console.error(error));

const mapMerge = fn => map(merge(fn));
export const foldImPairs = mapMerge((name, messages) => ({ name, messages }));
