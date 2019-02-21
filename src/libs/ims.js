import { compose } from "crocks";
import { map, filter, merge } from "crocks/pointfree";
const mapMerge = fn => map(merge(fn));

export default authToken => ({
  fetchImHistory: ims =>
    Promise.all(
      ims.map(({ id }) =>
        getSlack("im.history", { channel: id, unreads: true }).then(JSON.parse)
      )
    ),
  extractUnreadIms: response =>
    response.messages.slice(0, response.unread_count_display),
  hasUnreadIms: response =>
    response.unread_count_display && response.unread_count_display > 0,
  // [response:Object] -> [response:Object]
  filterUnreadIms: compose(
    map(extractUnreadIms),
    filter(hasUnreadIms)
  ),
  fetchImUser: unreadIms =>
    Promise.all(
      unreadIms.map(messages =>
        getSlack("users.info", { user: messages[0].user, token: authToken })
          .then(JSON.parse)
          .then(response => Pair(response.user.name, messages))
      )
    ).catch(error => console.error(error)),
  foldImPairs: mapMerge((name, messages) => ({ name, messages }))
});
