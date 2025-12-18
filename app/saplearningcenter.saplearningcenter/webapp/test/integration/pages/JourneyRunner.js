sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"saplearningcenter/saplearningcenter/test/integration/pages/Entity1Main"
], function (JourneyRunner, Entity1Main) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('saplearningcenter/saplearningcenter') + '/test/flpSandbox.html#saplearningcentersaplearningce-tile',
        pages: {
			onTheEntity1Main: Entity1Main
        },
        async: true
    });

    return runner;
});

