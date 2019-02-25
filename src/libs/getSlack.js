import querystring from "querystring";
import got from "got";

export const getSlack = (path = "", qs = {}) => {
  const params = querystring.stringify(qs);
  return got(`https://slack.com/api/${path}?${params}`).then((res) => res.body );
};
