// Datamodellen for spillet

let model = {

    game: { 
        currentLevel: 1,    
    },

    canvasProperties: {
        width: 1000,
        height: 700,
        backgroundColor: 'white'
    },

    //The levels of the scenario
    ScenarioLevels: 
    {
        scenarioID: 1,
        scenarioDescription: "This is the description of Scenario 1 \n and its tasks",
        //This lists the boxes in the scenario
        BoxesList: 
        [
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
        ],


    }



}