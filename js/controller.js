//Globale vars
let canvas = null;
let context = null;
let boxes = [];
let lanes = [];
//Globale variabler som brukes til å holde styr på hvilken boks som dras, og offset for å få riktig posisjon
let draggingBox = null;
let offsetX = 0;
let offsetY = 0;
//mellomlagrer brukerens løsning. I denne foreløpige løsningen, lagres KUN transitions mellom bokser.
let currentUserSolution = []; 
// === Globale variabler for koblinger ===
let connections = []; // {fromId: "node_1", toId: "node_3"}
let connecting = false;
let startNode = null;
let tempLineEnd = { x: 0, y: 0 };

let currentSelectedBox = null; // Brukes til å lagre siste boksen vi trykket på, slik at vi kan hente ut nodeID, som kan brukes til å slette tilkn.

// Læringsmåling (BKT)

// Spillerobjekt – brukes til å knytte resultater til en bestemt bruker
let player = {
  id: "",          // ID (initialer + dato, f.eks. TS2607)
  knowledge: 0.0   // Kunnskapsnivå, oppdateres via BKT
};

// Enkel versjon av Bayesian Knowledge Tracing (BKT)
class BKT {
  constructor(start = 0.3, learn = 0.2) {
    this.P = start;    // Startnivå (fra quiz eller antatt)
    this.learn = learn; // Hvor raskt spilleren lærer
  }

  // Oppdaterer sannsynligheten for læring basert på om spilleren gjør riktig eller feil
  update(isCorrect) {
    this.P = isCorrect
      ? this.P + (1 - this.P) * this.learn   // Øker hvis riktig
      : this.P * (1 - this.learn / 2);       // Minker litt hvis feil
    return this.P;
  }
}

// Opprett en standard BKT-instans
let learner = new BKT();

// Midlertidig funksjon for å simulere et quiz-resultat (kan kobles til faktisk quiz senere)
function loadQuizResult() {
  let quizScore = 0.6; // Eksempel: 60 % riktig
  player.knowledge = quizScore;
  learner = new BKT(quizScore);
  console.log("Startnivå fra quiz:", quizScore);
}


async function initCanvas() 
{
  // Loads game data - This needs to be loaded first, before any BMPN Elements are loaded.
  const scenarioData = await loadScenarioJSON('scenarioData/scenario.json')
  model.loadedScenarioData = scenarioData; // stores all data loaded from JSON
  
    //Henter canvas elementet, laget i view.js, og setter bredde, høyde og farge
    canvas = document.getElementById('BPMNcanvas');
    context = canvas.getContext('2d');
    context.canvas.width = model.canvasProperties.width;
    context.canvas.height = model.canvasProperties.height;
    context.fillStyle = model.canvasProperties.backgroundColor;
    context.fillRect(0, 0, model.canvasProperties.width, model.canvasProperties.height);

    // Legger til listeners, slik at funksjoner blir kalt ved musehendelser ('intern event systemet henter', funksjonen som skal kalles)
    canvas.addEventListener('mousedown', mouseDown);
    canvas.addEventListener('mousemove', mouseMove);
    canvas.addEventListener('mouseup', mouseUp); 

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    console.log(canvas);

    //Laster inn all data, så kaller draw();
    loadGameData(); //Loads from JSON
    loadScenario();
}

// Loads objects from loadedScenarioData into model.game
function loadGameData(){
  const gameData = model.loadedScenarioData.aboutScenarios;
  model.game.numberOfScenarios = gameData.numberOfScenarios
  model.game.moduleTitle = gameData.mainTitle
  model.game.moduleDescription = gameData.moduleDescription

}


function loadScenario(){

    //Henter info fra modellen, og oppdaterer view. Her henter den teksten for det nåværende scenarioet
    document.getElementById('moduleTitleHeader').innerText = model.game.moduleTitle;
    document.getElementById('moduleTextHeader').innerText = model.game.moduleDescription;

    // Henter bokser fra modellen...
    boxes = boxes.concat(processBoxes()); //henter bokser fra modellen, og kalkulerer x posisjon for boksene
    lanes = processLanes();
    //Setter Passasjer description, er egen funksjon fordi den endres ved verifisering. 
    setTaskDescription();

    //Når alt er lastet, tegn opp alt.
    draw()
}

function setTaskDescription()
{
  document.getElementById('taskText').innerText = model.loadedScenarioData.scenarios[model.game.currentScenario].scenarioTitle + "\n" + model.loadedScenarioData.scenarios[model.game.currentScenario].scenarioDescription

  let tokens = model.loadedScenarioData.scenarios[model.game.currentScenario].tokens;
  
  let verificationTextObject = document.getElementById('taskVerificationText');
  verificationTextObject.innerHTML = "";

  for(let i = 0; i < tokens.length; i++)
  {
      //using explicit true/false, since token.hasPassed can be null, its assigned during verification.
      if(tokens[i].hasPassed === true) {
        verificationTextObject.innerHTML += `${tokens[i].name} ${tokens[i].tasksHint} <span style='color: green;'>PASS</span> <br>` 
      }
      else if(tokens[i].hasPassed === false){
        verificationTextObject.innerHTML += `${tokens[i].name} ${tokens[i].tasksHint} <span style='color: red;'>FAIL</span> <br>` 
      }else{
        verificationTextObject.innerHTML += `${tokens[i].name} ${tokens[i].tasksHint} <br>`
      }
        
  }
      
}




function processBoxes(){
    
  //Only processes boxes from the current scenario, does nothing with the existing
    let newBoxes = model.loadedScenarioData.scenarios[model.game.currentScenario].nodes
      
    //Spawne bokser i midten av x akse i canvas
    //let centerOffset = boxes.reduce((accumulator, bx) => {return accumulator+bx.w},0) //Går igjennom alle box'ene, og summerer bredde
    //let nextXpos = (canvas.width / 2) - (centerOffset/2); //start X posisjon er halve bredden av canvas, - total lenge av boxer og padding
    let nextXpos = canvas.width/3; //Since we dont know the boxes width beforehand, we approximate the start point

    //Ensures sequential numbering, when adding new boxes.
    let numberOfExistingBoxesInCanvas = boxes.length;
    for (let i = 0; i < newBoxes.length; i++) {
        // Gi hver boks en unik ID i formatet "node_N"
        newBoxes[i].nodeId = `node_${numberOfExistingBoxesInCanvas + (i+1)}`;

        if(newBoxes[i].type === "activity") {newBoxes[i].w = model.game.activityBoxWidth; newBoxes[i].h = model.game.activityBoxHeight;}
        else {newBoxes[i].w = 60; newBoxes[i].h = 60}
        
        // Sett x og y posisjon
        newBoxes[i].x = nextXpos;
        newBoxes[i].y = canvas.height - 60;
        
        nextXpos += newBoxes[i].w + 10 //The next X position is this box's width, +10 px margin
    } 
    console.log("Boxes processed: ", newBoxes);
    return newBoxes;
} 


// Calculates the lane heigh and y position, by the number of lanes in the scenario.
function processLanes(){
    let lanes = model.loadedScenarioData.scenarios[model.game.currentScenario].poolLanes; 
    let laneHeight = (canvas.height / lanes.length)-20;

    for (let i = 0; i < lanes.length; i++) {
        // Sett x og y posisjon
        lanes[i].x = canvas.width * 0.05; //Lanes should start at 5% of the canvas width
        lanes[i].y = laneHeight * i; //increases .y position, to stack lanes on top of eachother
        lanes[i].w = canvas.width * 0.95 // Widht of the lane is 5% shorter than the canvas. Padding.
        lanes[i].h = laneHeight; // sets the heigh of the lane
    } 
    console.log("Lanes processed: ", lanes);
    return lanes;
} 






//draws all the elements in the Canvas
function draw() {
  // clear the canvas every update, prevents "drawing" when dragging
  context.clearRect(0, 0, canvas.width, canvas.height);

  drawLanes(lanes); // Passing the processed list of lanes as an argument to the drawLanes function
  drawConnections(); //Draws any connections


  //Draw all the processed boxes first, so they end up "on top of" the connection lines.
  for (let box of boxes) {
    const centerX = box.x + box.w / 2;
    const centerY = box.y + box.h / 2;

    // The color of the box changes depending on if its selected or not
    if (currentSelectedBox != null && currentSelectedBox.nodeId == box.nodeId) {
      context.fillStyle = model.settings.selectedBoxColor;
    } else {
      context.fillStyle = model.settings.standardBoxColor;
    }


    // Draws the correct box (gateway, activity/task or start/end) depending on type
    if (box.type === "xorGateway") {
      drawExclusiveGateway(centerX, centerY, 60); // Exclusve (X)
    } else if (box.type === "andGateway") {
      drawParallelGateway(centerX, centerY, 60);  // Parallell (+)
    } else if (box.type === "inclusiveGateway") {
      drawInclusiveGateway(centerX, centerY, 60); // Inclusive (O)
    } else if (box.type === "activity"){ 
      drawTaskBox(box.x, box.y);// Task/Activity boxes
    } else { 
      drawStartEndBoxes(box.x, box.y); //This just leaves Start and End event boxes
    }
      
    // Adds the text to all boxes, Gateways have their text offset to below their box
    drawBoxText(centerX, centerY, box)

    drawPoolTitle()
    

  }
}


//Triggered by the user pressing the "delete" key, or pressing the "Reset All" button.
function resetConnections(resetAll = false) {
  //En liten "override" til en "Reset" knapp, resetAll vil alltid være default False, om den er True sletter den alle koblinger
  if(resetAll == true){
    currentUserSolution = [];
    connections = [];
    draw();
    return;
  }

  // This checks if the selected box has any connections, then deletes those connections.
  // if no connections are found, we delete the last entry in the connections array instead
  if(Object.keys(connections).length != 0){  //If there are any connections..
    if(currentSelectedBox != null){ //..and a box is selected...
      connections = connections.filter(object => { //..go through the array, and check if nodeObjects toId or fromId contains the selected box' nodeId
      
      //if the nodeId we are looking for neither in the fromId, or toId of the current object...
      if(!object.fromId.includes(currentSelectedBox.nodeId) && !object.toId.includes(currentSelectedBox.nodeId))
      {
        return true; //...we keep this box (nodeObject) in the list of connections
      }else{
        return false; //..if it is a match, we do not keep it in the connections array, meaning it will not be redrawn in the canvas (which draws connections based on the connection array)
      } 
      })
    }else{// if no box is selected, simply pop and delete the last connection object ({fromId:, toId:}) from the list of connections.
      let lastLine = connections.pop();
      delete connections[lastLine];
    }
  } 

  //re draws the canvas, with the updated connections array.
  draw();
}


// Triggers on mouseClick
function mouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  currentSelectedBox = null; //If not clicking a box, deselects the selected box.

  // right click to start drawing an arror (connection)
  if (e.button === 2) {
    for (let b of boxes) {
      if (
        mouseX > b.x && mouseX < b.x + b.w &&
        mouseY > b.y && mouseY < b.y + b.h
      ) {
        connecting = true;
        startNode = b;
        tempLineEnd = { x: mouseX, y: mouseY };
        console.log("Startet kobling fra:", b.nodeId);
        return;
      }
    }
  } else {
    // left click moves the box
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (
        mouseX > b.x && mouseX < b.x + b.w &&
        mouseY > b.y && mouseY < b.y + b.h
      ) {
        draggingBox = b;
        currentSelectedBox = b; //stores the last clicked box
        offsetX = mouseX - b.x;
        offsetY = mouseY - b.y;
        break;
      }
    }
    if(currentSelectedBox != null){console.log(currentSelectedBox.nodeId)}; // Testing, last box clicked logged to console.
  }

  draw(); //This draw call is needed to update the selected box, redrawing its color
}

// Når musen beveges
function mouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Hvis vi tegner en pil
  if (connecting && startNode) {
    tempLineEnd = { x: mouseX, y: mouseY };
    draw();
    drawArrow(startNode.x + startNode.w / 2, startNode.y + startNode.h / 2, mouseX, mouseY);
    return;
  }

  // Vanlig flytting av bokser
  if (!draggingBox) return;
  draggingBox.x = mouseX - offsetX;
  draggingBox.y = mouseY - offsetY;
  draw();
}

// Når musen slippes
function mouseUp(e) {
  if (connecting && startNode) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    for (let b of boxes) {
      if (
        mouseX > b.x && mouseX < b.x + b.w &&
        mouseY > b.y && mouseY < b.y + b.h &&
        b !== startNode
      ) {
        const newConn = { fromId: startNode.nodeId, toId: b.nodeId };

        // Sjekk om koblingen finnes fra før, +sjekker at koblingen ikke matcher "bakover"
        if (!connections.some(c => (c.fromId === newConn.fromId && c.toId === newConn.toId) || (c.fromId === newConn.toId && c.toId === newConn.fromId))) {
          connections.push(newConn);
          //The solutions list doesnt need to be created until the solution should be verified.
          //currentUserSolution.push([newConn.fromId, newConn.toId]);
          //currentUserSolution.push([startNode.task, b.task]); //the users solution uses task, instead of ID, duplicate set requires duplicate deletion
          console.log("Ny kobling:", newConn);
        }
      }
    }

    connecting = false;
    startNode = null;
    draw();
  }

  draggingBox = null;
}


//Midlertidig, løsning, trykk "n" for å gå til neste scenario, Delete for å slette connections.
document.addEventListener('keydown', (event) => {
    if(event.key == "n") {
        nextScenario();
    }
    if(event.key == 'Delete'){
      resetConnections();
    }
  
  });


//Laster neste scenario
function nextScenario(){
    if(model.game.currentScenario < model.ScenarioLevels.length){
        model.game.currentScenario += 1;
        //boxes = processBoxes(); //henter nye bokser fra the nye scenariet.    This is already done in the loadScenario
        loadScenario(); //oppdaterer teksten i view
        draw(); //tegner opp alt på nytt, siden nytt scenario er hentet
    } else {
        //Om det ikke er flere scenario, lag en alert box
        //alert("Ikke flere scenarioer!");
        showLinkToQuiz();
        
    }
}

//Viser link til quiz, etter siste scenario
function showLinkToQuiz(){
    //Viser en alert box med link til quiz
    document.getElementById('finishedTextHeader').innerHTML = /*html*/`
    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">All scenarios completed<br>Please continue to the last quiz</a>
    
    
  
    
    `; 
}
//Midlertidig, funksjon for å teste løsning i console.
function testSolution(){
    console.log("Brukerens løsning: ", currentUserSolution,"\n\n Prøver å verifisere løsning...");
    verifySolution();
}



// Sjekker brukerens løsning mot riktig løsning (enklere versjon)
function verifySolution() {
  // Nullstiller tidligere data
  let results = [];

  //creating an array of objects containing "nodeID" and "task" from the nodes in the "boxes" array created earlier
  let nodeTaskMap = Object.fromEntries(boxes.map(n => [n.nodeId, n.task]));
  //putting together the users solution, {task, task} to compare with the predefined solution.
  currentUserSolution = connections.map(task => [nodeTaskMap[task.fromId], nodeTaskMap[task.toId]]); 

  //Converting the users solution to strings for comparison, storing in a new temp var
  let userSolution = new Set(currentUserSolution.map(pairs => JSON.stringify(pairs)))
  console.log(userSolution);

  for (let token of model.loadedScenarioData.scenarios[model.game.currentScenario].tokens)
  {
    //If a every element of a tokens requiredTasks exists in the users diagram solution
    //Stringification helps comparison.
    if(token.requiredTasks.every(pair => userSolution.has(JSON.stringify(pair))))
    {
      console.log(token.name + " Passed");
      token.hasPassed = true;
    }else{
      console.log(token.name + " Failed");
      token.hasPassed = false;
    }
  }

  setTaskDescription() //Oppdaterer status på passasjer beskrivelsen.

  //Læringssystemet

  // Sjekker om brukerens løsning er lik den riktige
  //let isCorrect = JSON.stringify(currentUserSolution) === JSON.stringify(correctSolution);
  let isCorrect = false;


  // Legger til resultat (1 = riktig, 0 = feil)
  results.push(isCorrect ? 1 : 0);

  // Oppdaterer spillerens kunnskapsnivå (BKT)
  if (typeof learner !== "undefined") {
    player.knowledge = learner.update(isCorrect);
    console.log(`Oppdatert kunnskapsnivå: ${player.knowledge.toFixed(2)}`);
  }

  // Logger resultat til konsollen (for utvikleren)
  console.log(`Scenario ${model.game.currentScenario}: ${isCorrect ? "Riktig" : "Feil"}`);

 // Lagre læringsdata lokalt i nettleseren
const data = {
  id: player.id,
  scenario: model.game.currentScenario + 1, // legger til scenarionummer
  knowledge: player.knowledge,
  result: isCorrect ? 1 : 0,
  timestamp: new Date().toLocaleString(),
};

// Lagrer resultatet i localStorage
localStorage.setItem(`learning_${player.id}_scenario${data.scenario}`, JSON.stringify(data));
console.log("Læringsdata lagret:", data);

// Eksporter automatisk til CSV etter hvert scenario
//exportPlayerProgressToCSV(true); //Trenger ikke nedlasting under test. 
}

//  STARTSPILL-FUNKSJON 
// Denne funksjonen kjører når brukeren trykker "Start spill"
function startGame() {
  // Hent verdier fra input-feltene
  const initials = document.getElementById("initials").value.trim().toUpperCase();
  const day = document.getElementById("birthDay").value.trim().padStart(2, "0");
  const month = document.getElementById("birthMonth").value.trim().padStart(2, "0");

  // Sjekk at alle felt er fylt inn
  if (!initials || !day || !month) {
    alert("Vennligst fyll ut alle felt (initialer, dag og måned).");
    return;
  }

  // Bygger spiller-ID, f.eks. TS2607
  const playerID = `${initials}${day}${month}`;
  player.id = playerID;
  console.log("👤 Spiller-ID:", player.id);

  // Skjul login-seksjonen og vis spillet
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("app").style.display = "block";

  // Laster inn startverdi (quiz-score) og starter spillet
  loadQuizResult();

  initCanvas();

  // Oppdaterer visning av kunnskapsnivå
  updateLearningDisplay();
}

// OPPDATERER KUNNSKAPSNIVÅ I VISNINGEN 
function updateLearningDisplay() {
  const val = document.getElementById("knowledgeValue");
  if (val && player) val.textContent = player.knowledge.toFixed(2);
}

// OPPDATER VISNINGEN ETTER HVER VERIFISERING 
// Denne "wrapper" verifySolution slik at kunnskapsnivået oppdateres automatisk etter brukeren sjekker løsningen
const gammelVerify = verifySolution;
verifySolution = function () {
  gammelVerify();
  updateLearningDisplay();
};

// EKSPORTER ALLE RESULTATER TIL CSV 
// Denne funksjonen samler alle "learning_*"-elementer i localStorage
// og lagrer dem i en .csv-fil som lastes ned i nettleseren
function exportResultsToCSV() {
  // Samle alle nøkler som starter med "learning_"
  const keys = Object.keys(localStorage).filter(k => k.startsWith("learning_"));
  if (keys.length === 0) {
    alert("no learnigndata found!");
    return;
  }

  // Bygg CSV-header og rader
  let csvContent = "PlayerID,Knowledge,Result,Timestamp\n";

  keys.forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    csvContent += `${data.id},${data.knowledge},${data.result},${data.timestamp}\n`;
  });

  // Lag en Blob (datafil) og last den ned som CSV
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "learning_results.csv");
  link.click();
}

// === EKSPORTER SPILLERFREMDRIFT TIL CSV ===
// Denne funksjonen samler all lagret læringsdata (fra localStorage)
// og laster det automatisk ned som en CSV-fil.
function exportPlayerProgressToCSV(autoDownload = false) {
  // Henter alle nøkler som starter med "learning_"
  const keys = Object.keys(localStorage).filter(k => k.startsWith("learning_"));
  if (keys.length === 0) {
    alert("Ingen lagrede spillerdata funnet!");
    return;
  }

  // Lager CSV-header (kolonnenavn)
  let csvContent = "PlayerID,Scenario,Knowledge,Result,Timestamp\n";

  // Legger til data for hver spiller
  keys.forEach(key => {
    const data = JSON.parse(localStorage.getItem(key));
    csvContent += `${data.id},${data.scenario},${data.knowledge},${data.result},${data.timestamp}\n`;
  });

  // Oppretter CSV-blob (filinnhold)
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // Lagrer filen lokalt
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "spiller_fremdrift.csv");
  document.body.appendChild(link);

  // Hvis autoDownload = true → last ned automatisk etter scenario
  if (autoDownload) {
    link.click();
  }

  document.body.removeChild(link);
  console.log("💾 CSV-fil generert:", "spiller_fremdrift.csv");
}



