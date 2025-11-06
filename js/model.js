// Datamodellen for spillet

let model = {
    settings:{
        selectedBoxColor: 'rgba(171, 224, 224, 0.70)',
        standardBoxColor: 'rgba(255, 255, 255, 1)',
        laneBorderColor: 'rgba(99, 99, 99, 1)'
    },

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
        height: window.screen.height*0.5,
        backgroundColor: 'white'
    },

    loadedScenarioData: null,

    //levels of the scenario
    ScenarioLevels: 
    [{
        

        ScenarioSolution: 
        [//Midlertidig løsning. Liste av riktige tilknytninger mellom "Tasks", som kan brukes til å verifisere brukerens løsning
            //Passasjer 1 - Har pass, ingen bagasje
            [["start", "task1"],["task1","end"]],//Eksempel på riktig rekkefølge av noder. Eksempel: Start -> Check-in -> End
            //Passasjer 2 - Har pass, har bagasje 
            [["start", "task2"],["task2","task1"],["task1","end"]],//Eksempel på riktig rekkefølge av noder. Eksempel: Start -> Baggage drop -> Check in -> End.
            //Passasjer 3 - Har ikke pass, ikke bagasje
            [["start","exit"]],
        ]




    }   


]

}