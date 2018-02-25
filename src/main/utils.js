/*
  Author: Edward Seufert - Cborgtech, LLC
*/

exports.compareIgnoreCase = (a,b) => {
  if (a.name.toUpperCase() < b.name.toUpperCase()) {
    return -1;
  } else if (a.name.toUpperCase() > b.name.toUpperCase()) {
    return 1;
  } else {
    return 0;
  }
}

exports.testSleep = (millis) => {
    return new Promise(resolve => setTimeout(resolve, millis));
}
