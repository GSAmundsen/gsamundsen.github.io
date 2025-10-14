// Datamodellen for spillet

let model = {
    settings:{
        selectedBoxColor: 'rgba(171, 224, 224, 0.91)',
        standardBoxColor: 'rgba(221, 212, 212, 0.91)'
    },

    game: { 
        currentScenario: 0,    
    },

    canvasProperties: {
        width: 1000,
        height: 700,
        backgroundColor: 'white'
    },

    //levels of the scenario
    ScenarioLevels: 
    [{
        scenarioID: 0,// ikke i bruk, enda
        scenarioDescription: `
        All Passengers with tickets to go through the Check-in.\n
        Passengers that have no luggage needs to go to the Baggage Drop first.\n
        Passengers without passports are rejected.`,
        
        //boxes in the scenario
        BoxesList: 
        [
            {   x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 60, h: 60,
                color: "lightgrey", 
                text:"Start"
            },

            {
                x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 120, h: 60,
                color: "lightgrey", 
                text: "Manual Check-in",
            },

            {
                x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 120, h: 60,
                color: "lightgrey", 
                text: "Baggage drop",
            },

            {
                x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 60, h: 60,
                color: "lightgrey", 
                text: "End",
            },

            //Neste "boks" i dette scenarioet her..
        ],

        ScenarioSolution: 
        [//Midlertidig løsning. Liste av riktige tilknytninger mellom "Tasks", som kan brukes til å verifisere brukerens løsning
            //Passasjer 1 - Har pass, ingen bagasje
            [["start", "task1"],["task1","end"]],//Eksempel på riktig rekkefølge av noder. Eksempel: Start -> Check-in -> End
            //Passasjer 2 - Har pass, har bagasje 
            [["start", "task2"],["task2","task1"],["task1","end"]],//Eksempel på riktig rekkefølge av noder. Eksempel: Start -> Baggage drop -> Check in -> End.
            //Passasjer 3 - Har ikke pass, ikke bagasje
            [["start","exit"]],
        ]




    }, 
    {
        scenarioID: 1,// ikke i bruk, enda
           scenarioDescription: "This is the description of Scenario 2 \n and its tasks",
           //boxes in the scenario
           BoxesList: 
           [
            {
                x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 60, h: 60,
                color: "lightgrey", 
                text: "StartState",
            },
            {   x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 120, h: 60,
                color: "lightgrey", 
                text:"Auto. Check-in"
            },

            {
                x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 120, h: 60,
                color: "lightgrey", 
                text: "Manual Check-in",
            },
            {
                x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 120, h: 60,
                color: "lightgrey", 
                text: "Security Check",
            },
            {
                x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 60, h: 60,
                color: "lightgrey", 
                text: "EndState",
            },

               //Neste "boks" i dette scenarioet her..
           ],

           ScenarioSolution: [//kanskje en liste av riktige tilknytninger mellom "Tasks", som kan brukes til å verifisere brukerens løsning
            //Passasjer 1 - Har pass, ingen bagasje
            [["start", "task1"],["task1","end"]],//Eksempel på riktig rekkefølge av noder. Eksempel: Start -> Check-in -> End
            //Passasjer 2 - Har pass, har bagasje 
            [["start", "task2"],["task2","task1"],["task1","end"]]//Eksempel på riktig rekkefølge av noder. Eksempel: Start -> Baggage drop -> Check in -> End.
            
           ]
    },

]




}