//the model containing game data
let model = {
    settings:{
        selectedBoxColor: 'rgba(171, 224, 224, 0.70)',
        standardBoxColor: 'rgba(255, 255, 255, 1)',
        laneBorderColor: 'rgba(99, 99, 99, 1)'
    },

    loadedScenarioData: null,

    game: { 
        currentScenario: 0,
        moduleTitle: "", 
        moduleDescription: "", 
        activityBoxWidth: 120, 
        activityBoxHeight: 60,
        gatewayBoxWidth: 60,
        gatewayBoxHeight: 60
    },

    canvasProperties: {
        width: window.screen.width*0.80,
        height: window.screen.height*0.6,
        backgroundColor: 'white'
    },

}