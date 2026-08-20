'use strict';

// SafeLedger 2.x is free software. This compatibility module intentionally
// treats every installation as activated so legacy renderer code can start
// without the retired licensing service.
exports.checkInstallCode = async () => ({
  status: 'SUCCESS',
  keyCode: '',
  initialCode: ''
});
