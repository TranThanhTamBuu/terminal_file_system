const MD5 = require('crypto-js/md5');
const moment = require('moment');

module.exports = {
  checkName(name) {
    var pattern = /^[a-zA-Z0-9 _-]+$/;
    return pattern.test(name);
  },

  findSamePath(path_1, path_2) {
    var min_length = (path_1.length > path_2.length)? path_2.length : path_1.length;
    var same = "";

    for (let i = 0; i < min_length; i++) {
      if (path_1[i] == path_2[i])
        same += path_1[i];
      else
        break;
    }

    return same;
  },

  getSlashIdx(path) {
    var slash_idx = [];

    for (let i = 0; i < path.length; i++)
      if (path[i] === "/") slash_idx.push(i);

    return slash_idx;
  },

  getName(path) {
    var spl = path.split('/');
    return spl[spl.length - 1];
  },

  hashTimestampMySQL(time){
    return MD5(moment(time).format('YYYY-MM-DD HH:mm:ss')).toString();
  }
};
