'use strict';


// Returns UTC Day of Week, Mo: 1, Su: 7
function getDayOfWeek(ts) {
  let d = ts ? new Date(ts) : new Date;

  return (d.getUTCDay()+6) % 7 +1;
}


module.exports = {
  getDayOfWeek,
}
