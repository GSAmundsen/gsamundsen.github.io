let model = {
    settings:{
        selectedBoxColor: 'rgba(171, 224, 224, 0.70)',
        standardBoxColor: 'rgba(255, 255, 255, 1)',
        laneBorderColor: 'rgba(99, 99, 99, 1)'
    },

    // Raw JSON data
    loadedScenarioData: null,

    // Other static properties
    staticProperties: {
        canvasBackgroundColor: 'white',
        selectedBoxColor: 'rgba(171, 224, 224, 1)',
        normalBoxFill: 'white',
    },
    
    // Information about the current game
    game: {
        currentScenario: null, //Sjekk hvorfor denne skulle være "null", Ellers tror findScenario() at nåværende scenario er ferdig..
        finishedScenarios: [],
        numberOfScenarios: 0,
        mainTitle: null,
        moduleDescription: null,
        sequential: null,
        building: null,
        canvasWidth: 0,
        canvasHeight: 0,
    },
    canvasProperties: {
        width: window.screen.width*0.80,
        height: window.screen.height*0.5,
        backgroundColor: 'white'
    },

    //levels of the scenario
    ScenarioLevels: 
    [{
        scenarioID: 0,// ikke i bruk, enda
        //Kanskje dele opp passasjerbeskrivelse i lister, tilsvarende ScenarioSolution[], som beskriver riktig tilkn. for hver passasjer
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
                text:"Start",
                type: "task"
            },

            {
                x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 120, h: 60,
                color: "lightgrey", 
                text: "Manual Check-in",
                type: "task"
            },

            {
                x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 120, h: 60,
                color: "lightgrey", 
                text: "Baggage drop",
                type: "task"
            },

            {
                x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 60, h: 60,
                color: "lightgrey", 
                text: "End",
                type: "task"
            },
            {
                x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 60, h: 60,
                color: "lightgrey", 
                text: "",
                type: "gateway_para"
            },
            {
                x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 60, h: 60,
                color: "lightgrey", 
                text: "",
                type: "gateway_inc"
            },
            {
                x:0, y:600, //Trenger denne. x posisjon regnes ut etter antall Tasks
                w: 60, h: 60,
                color: "lightgrey", 
                text: "",
                type: "gateway_exc"
            },

            //Neste "boks" i dette scenarioet her..
        ],

        PoolTitle: "Pool title", // Only using 1 pool for this project.. or else this would be another object. 
        
        //Lane sizes and positions are determined automatically (by how many Lanes the scenario has)
        LanesList:
        [
            {
                x:0, y:0, w:0, h:0,
                title:"this is the title of the Lane",
                borderColor: "lightgrey"
            },
            {
                x:0, y:0, w:0, h:0,
                title:"this is the title of the Lane",
                borderColor: "lightgrey"
            },
            
            {
                x:0, y:0, w:0, h:0,
                title:"this is the title of the Lane",
                borderColor: "lightgrey"
            },

        ],
        ScenarioPassengerTypes: //This needs to match the ScenarioSolution
        [
            "All Passengers with tickets to go through the Check-in.",
            "Passengers that have no luggage needs to go to the Baggage Drop first.",
            "Passengers without passports are rejected.",

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
                type: "task"
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
    }],
    
    // Information about the current scenario
    currentScenario: {
        scenarioTitle: null,
        scenarioDescription: null,
        tutorialImage: null,
        failureImage: null,
        pools: [],
        lanes: [],
        staticNodes: [],
        staticConnectors: [],
        dynamicNodesInMenu: [],
        dynamicNodesOnCanvas: [],
        dynamicConnectors: [],
        tokens: [],
    }
}