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
let currentUserSolution = [["start","task1"],["start", "task2"],["task2","task1"],["task1","end"]]; 
// === Globale variabler for koblinger ===
let connections = []; // {fromId: "node_1", toId: "node_3"}
let connecting = false;
let startNode = null;
let tempLineEnd = { x: 0, y: 0 };

let testResults = []; //List of strings, PASS or FAIL. Index needs to match the corresponding entry in ScenarioPassengerTypes and ScenarioSolutions
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

//Gammel initCanvas
/* function initCanvas() 
{
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
    loadScenario();
} */

// Maybe not needed
/* function loadScenario(){

let testResults = []; //List of strings, PASS or FAIL. Index needs to match the corresponding entry in ScenarioPassengerTypes and ScenarioSolutions
let currentSelectedBox = null; // Brukes til å lagre siste boksen vi trykket på, slik at vi kan hente ut nodeID, som kan brukes til å slette tilkn.
} */


async function initCanvas() 
{
  // Loads game data
  const scenarioData = await loadScenarioJSON('scenarioData/scenario.json')
  model.loadedScenarioData = scenarioData;
  loadGameData();

  // Prepares canvas element
  canvas = document.getElementById('BPMNcanvas');
  context = canvas.getContext('2d');
  context.canvas.width = model.game.canvasWidth;
  context.canvas.height = model.game.canvasHeight;
  context.fillStyle = model.staticProperties.canvasBackgroundColor;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);

  // Adds canvas and document listeners
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mouseup', mouseUp);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener('keydown', handleKeyPress);
    // Henter bokser fra modellen...
  newScenario();
  
  boxes = processBoxes(); //henter bokser fra modellen, og kalkulerer x posisjon for boksene
  lanes = processLanes();
  
  //Setter Passasjer description, er egen funksjon fordi den endres ved verifisering. 
  setTaskDescription();

  // Loads and deploys scenario data
}

// Loads objects from loadedScenarioData into model.game
function loadGameData(){
  const gameData = model.loadedScenarioData.aboutScenarios;
  model.game.numberOfScenarios = gameData.numberOfScenarios
  model.game.mainTitle = gameData.mainTitle
  model.game.moduleDescription = gameData.moduleDescription
  model.game.sequential = gameData.sequential
  model.game.building = gameData.building
  model.game.canvasWidth = gameData.canvasSize.width
  model.game.canvasHeight = gameData.canvasSize.height
}

function setTaskDescription(results = [])
{
  let passengerTypes = model.ScenarioLevels[model.game.currentScenario].ScenarioPassengerTypes;
  let textObject = document.getElementById('taskText');
  textObject.innerHTML = "";

  for(let i = 0; i < passengerTypes.length; i++)
      {
        //Om vi har resultater som skal legges til hver linje i PassengerTypes, så legg dette til i HTML koden..
        (results.length != 0) ? textObject.innerHTML += 
        //.. Passasjertype beskrivelsen + resultatet. Om resultatet i listen er PASS, skal teksten være grønn, om ikke, så Rød. <br> er linebreak.
        `${passengerTypes[i]} - ${(results[i] == "PASS") ? "<span style='color: green;'>PASS</span>" : "<span style='color: red;'>FAIL</span>"} </span> <br>` 
        : textObject.innerHTML += `${passengerTypes[i]} <br>`;
        console.log(results);
      }
}



// ...etter å ha kalkulert x posisjon for boksene, basert på antall bokser slik at de spres utover
function processBoxes(){
    let boxes = model.ScenarioLevels[model.game.currentScenario].BoxesList; 
    //Spawne bokser i midten av x akse i canvas
    let centerOffset = boxes.reduce((accumulator, bx) => {return accumulator+bx.w},0) //Går igjennom alle box'ene, og summerer bredde
    let nextXpos = (canvas.width / 2) - (centerOffset/2); //start X posisjon er halve bredden av canvas, - total lenge av boxer og padding

    for (let i = 0; i < boxes.length; i++) {
        // Gi hver boks en unik ID i formatet "node_N"
        boxes[i].nodeId = `node_${i + 1}`;

        // Beregn x-posisjon + padding, basert på bredden av forrige box
        if(i != 0) {nextXpos+=boxes[i-1].w + 10}

        // Sett x og y posisjon
        boxes[i].x = nextXpos;
        boxes[i].y = 5;
    } 
    console.log("Boxes processed: ", boxes);
    return boxes;
} 

// Calculates the lane heigh and y position, by the number of lanes in the scenario.
function processLanes(){
    let lanes = model.ScenarioLevels[model.game.currentScenario].LanesList; 
    let laneHeight = canvas.height / lanes.length;

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






//Sletter canvas, og tegner opp alt på nytt. Kalles hovedsakelig når musen flyttes (mouseMove())
function draw() {
  //Old Draw Functionality

  // clear the canvas every update, prevents "drawing" when dragging
 /*  context.clearRect(0, 0, canvas.width, canvas.height);

  drawLanes(lanes); // Passing the processed list of lanes as an argument to the drawLanes function


  // Tegn alle koblinger (piler) mellom bokser først
  // Dette sikrer at linjene havner "under" boksene
  if (Object.keys(connections).length != 0) {
    for (let c of connections) {
      const from = boxes.find(b => b.nodeId === c.fromId);
      const to = boxes.find(b => b.nodeId === c.toId);
      if (from && to) {
        drawArrow(
          from.x + from.w / 2,
          from.y + from.h / 2,
          to.x + to.w / 2,
          to.y + to.h / 2
        );
      }
    }
  }


  // Tegn alle bokser og gateways oppå linjene
  for (let box of boxes) {
    const centerX = box.x + box.w / 2;
    const centerY = box.y + box.h / 2;

    // Sjekk hvilken farge boksen skal ha (markert eller standard) 
    if (currentSelectedBox != null && currentSelectedBox.nodeId == box.nodeId) {
      context.fillStyle = model.settings.selectedBoxColor;
    } else {
      context.fillStyle = model.settings.standardBoxColor;
    }

    // Tegn gateway basert på type
    if (box.type === "gateway_exc") {
      drawExclusiveGateway(centerX, centerY, 60); // Eksklusiv (X)
    } else if (box.type === "gateway_para") {
      drawParallelGateway(centerX, centerY, 60);  // Parallell (+)
    } else if (box.type === "gateway_inc") {
      drawInclusiveGateway(centerX, centerY, 60); // Inklusiv (O)
    } else {
      // Vanlig rektangulær boks (Task, Start, End, etc.)
      context.fillRect(box.x, box.y, box.w, box.h);
      context.strokeStyle = "black";
      context.strokeRect(box.x, box.y, box.w, box.h);
    }

    // Tegn tekst på boksen eller rett under gateway 
    context.fillStyle = "black";
    context.font = "14px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";

    //Kaster inn en liten text på Pool her, endre denne. 
    context.fillText(model.ScenarioLevels[model.game.currentScenario].PoolTitle, 35, canvas.height/2)

    if (box.type.startsWith("gateway")) {
      // Plasser teksten litt under gateway-symbolene
      context.fillText(box.text, centerX, centerY + box.h / 2 + 15);
    } else {
      // Plasser teksten midt inni vanlige bokser
      context.fillText(box.text, box.x + box.w / 2, box.y + box.h / 2);
    }
  }
 */

  // Called upon scenario initaition and mouse movement. Deletes the whole canvas and then redraws it.


  //New Draw Functionality
  // clear the canvas every update, prevents "drawing" when dragging
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw order to create correct visual
  drawPools(model.currentScenario.pools);
  drawLanes(model.currentScenario.lanes);
  connectorCoordinates(model.currentScenario.staticConnectors);
  connectorCoordinates(model.currentScenario.dynamicConnectors);
  drawNodes(model.currentScenario.staticNodes);
  drawNodes(model.currentScenario.dynamicNodesInMenu);
  drawNodes(model.currentScenario.dynamicNodesOnCanvas);
  drawTemporaryArrow();

}





function resetConnections(resetAll = false) {
  //En liten "override" til en "Reset" knapp, resetAll vil alltid være default False, om den er True sletter den alle koblinger
  if(resetAll == true){
    currentUserSolution = [];
    draw();
    return;
  }

  if(Object.keys(connections).length != 0){  //Om det er noen tilkoblinger..
    if(currentSelectedBox != null){ //og Om vi har valgt en boks...
      connections = connections.filter(object => { //Siden vi bruker en liste med objecter, sjekker vi om toID eller fromID inneholder "nodeID_X",
        //.filter() går igjennom alle objektene i en liste, returneres True for et objekt er kommer den med i den "nye" listen, om False, så ikke.
        console.log("Koblinger til/fra "+ currentSelectedBox.nodeId+ " slettet fra " + object);
        if(!object.fromId.includes(currentSelectedBox.nodeId) && !object.toId.includes(currentSelectedBox.nodeId))//Om nodeID'en vi ser etter finnes i enten toID eller fromID..
          {
            return true;// Om hverken toId eller fromId inneholder "nodeId_x" returneres True, da dette objektet skal være med i listen.
          }else{return false;} 
        })
    }else{//Har vi ikke valgt noen boks, så bare sletter vi siste tilknytningen (objektet) i listen. 
      let lastLine = connections.pop();
      delete connections[lastLine];
      console.log("Siste kobling slettet");
    }
  }

  //Tegner alt på nytt, siden vi har endrer listene
  draw();
}


// Når brukeren trykker ned musen
function mouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  currentSelectedBox = null; //Om vi trykker andre steder enn på en boks, så nullstill slik at vi ikke har en boks valgt.
  const allNodes = getNodes()
  // Høyreklikk: start å tegne en pil
  if (e.button === 2) {
    for (let i = allNodes.length - 1; i >= 0; i--) {
      const node = allNodes[i];
      if (
        mouseX > node.coordinates.x && mouseX < node.coordinates.x + node.width &&
        mouseY > node.coordinates.y && mouseY < node.coordinates.y + node.height
      ) {
        connecting = true;
        startNode = node;
        tempLineEnd = { x: mouseX, y: mouseY };
        return;
      }
    }
  } else {
    // Venstreklikk: dra boksen
    for (let node of allNodes) {
      if (
        node.static !== true && mouseX > node.coordinates.x && mouseX < node.coordinates.x + node.width &&
        mouseY > node.coordinates.y && mouseY < node.coordinates.y + node.height
      ) {
        draggingBox = node;
        currentSelectedBox = node; //Lagrer den siste boksen vi trykket på.
        offsetX = mouseX - node.coordinates.x;
        offsetY = mouseY - node.coordinates.y;

        break;
      }
    }
  }
  draw(); // Må ha en draw call her for å kunne endre farge kun ved "klikk" og ikke bare "drag".



  // Høyreklikk: start å tegne en pil
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
    // Venstreklikk: dra boksen
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (
        mouseX > b.x && mouseX < b.x + b.w &&
        mouseY > b.y && mouseY < b.y + b.h
      ) {
        draggingBox = b;
        currentSelectedBox = b; //Lagrer den siste boksen vi trykket på.
        offsetX = mouseX - b.x;
        offsetY = mouseY - b.y;

   
        break;
      }
    }
    if(currentSelectedBox != null){console.log(currentSelectedBox.nodeId)}; // Testing. Hvilken box.nodeID er trykket på
  }

  draw(); // Må ha en draw call her for å kunne endre farge kun ved "klikk" og ikke bare "drag".
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
  draggingBox.coordinates.x = mouseX - offsetX;
  draggingBox.coordinates.y = mouseY - offsetY;
  draw();
}

// Når musen slippes
function mouseUp(e) {
  if (connecting && startNode) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const allNodes = getNodes()
    const allConnectors = getConnectors()
    for (let node of allNodes) {
      if (
        mouseX > node.coordinates.x && mouseX < node.coordinates.x + node.width &&
        mouseY > node.coordinates.y && mouseY < node.coordinates.y + node.height &&      
        node !== startNode
      ) {
        // Future 2: only works if resetConnections fixes sequentiallity of connectors upon deletion...
        const connector_id = `connector_${allConnectors.length}`

        // Future 1: Currently hardcoded type selection, will need to be changed once we implement more connector types
        const newConn = { type: 'sequenceFlow', connectorId: connector_id, fromNodeId: startNode.nodeId, toNodeId: node.nodeId };

        // Sjekk om koblingen finnes fra før, +sjekker at koblingen ikke matcher "bakover"
        if (!allConnectors.some(c => (c.fromId === newConn.fromNodeId && c.toId === newConn.toNodeId) || (c.fromId === newConn.toNodeId && c.toId === newConn.fromNodeId))) {
          model.currentScenario.dynamicConnectors.push(newConn);
        }
      }
    }

    
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
          currentUserSolution.push([newConn.fromId, newConn.toId]);
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

function handleKeyPress(event) {
    if(event.key == "n") {
      // Current 1: should be replaced with a "Next Scenario" button that comes up after soultion is verified
        newScenario();
    }
    if(event.key == 'Delete'){
      resetConnections();
    }
}

function resetConnections(resetAll = false) {
  //En liten "override" til en "Reset" knapp, resetAll vil alltid være default False, om den er True sletter den alle koblinger
  if(resetAll == true){
    currentUserSolution = [];
    draw();
    return;
  }

  if(Object.keys(connections).length != 0){  //Om det er noen tilkoblinger..
    if(currentSelectedBox != null){ //og Om vi har valgt en boks...
      connections = connections.filter(object => { //Siden vi bruker en liste med objecter, sjekker vi om toID eller fromID inneholder "nodeID_X",
        //.filter() går igjennom alle objektene i en liste, returneres True for et objekt er kommer den med i den "nye" listen, om False, så ikke.
        console.log("Koblinger til/fra "+ currentSelectedBox.nodeId+ " slettet fra " + object);
        if(!object.fromId.includes(currentSelectedBox.nodeId) && !object.toId.includes(currentSelectedBox.nodeId))//Om nodeID'en vi ser etter finnes i enten toID eller fromID..
          {
            return true;// Om hverken toId eller fromId inneholder "nodeId_x" returneres True, da dette objektet skal være med i listen.
          }else{return false;} 
        })
    }else{//Har vi ikke valgt noen boks, så bare sletter vi siste tilknytningen (objektet) i listen. 
      let lastLine = connections.pop();
      delete connections[lastLine];
      console.log("Siste kobling slettet");
    }
  }

  //Tegner alt på nytt, siden vi har endrer listene
  draw();
}

// Comes from initCanvas or "n" and deploys scenario
function newScenario(){
  model.game.canvasHeight = model.loadedScenarioData.aboutScenarios.canvasSize.height
  const scenario = findScenario();
  loadScenario(scenario);
  if (scenario !== -1) {
    deployScenario();
  }
}

// Finds the current scenario to run using model.finishedScenarios and model.numberOfScenarios
function findScenario(){
  // If there is a current scenario it is marked as finished
  if (model.game.currentScenario !== null) {
    model.game.finishedScenarios.push(model.game.currentScenario);
  }

  // Check if all scenarios are completed
  if (model.game.finishedScenarios.length >= model.game.numberOfScenarios){
    return -1;
  }

  // Sequential mode: next scenario in order
  if (model.game.sequential){
    return model.game.finishedScenarios.length;
  }

  // Non-sequential: pick random unfinished scenario
  let availableScenarios = []
  for (let i = 0; i < model.game.numberOfScenarios; i++) {
    const scenarioId = `scenario_${i}`
    if (!model.game.finishedScenarios.includes(scenarioId)) {
      availableScenarios.push(i);
    }
  }
  const randomIndex = Math.floor(Math.random() * availableScenarios.length);
  return availableScenarios[randomIndex];
}

// Loads specific scenario into model.currentScenario
function loadScenario(scenario){
  // Future 1: the final screen should also be an optional inload via JSON
  // If game is over sends player to final screen
  console.log(scenario);
  if (scenario === -1) {
    endScreen();
    return;
  }
  model.game.currentScenario = scenario;
  // Preserves old scenario data if scenarios are building then wipes currentScenario clean
  if (model.game.building === true) {
    const lastScenario = model.currentScenario
  }
  resetCurrentScenario();


  // Loads in new scenario data
  const scenarioData = model.loadedScenarioData.scenarios[scenario];

  model.currentScenario.scenarioTitle = scenarioData.scenarioTitle
  model.currentScenario.scenarioDescription = scenarioData.scenarioDescription
  model.currentScenario.tutorialImage = scenarioData.tutorialImage
  model.currentScenario.failureImage = scenarioData.failureImage

  const tokens = scenarioData.tokens
  for (let token of tokens) {
    model.currentScenario.tokens.push(token);
  }

  const pools = scenarioData.static.pools
  for (let pool of pools) {
    model.currentScenario.pools.push(pool);
  }

  const lanes = scenarioData.static.lanes
  for (let lane of lanes) {
    model.currentScenario.lanes.push(lane);
  }

  //Pusher static nodes til Modellen, men hvorfor sette width
  const nodes = scenarioData.static.nodes
  for (let node of nodes) {
    node.static = true;
    node.width = getNodeWidth(node);
    node.height = 60;
    model.currentScenario.staticNodes.push(node);
  }

  const connectors = scenarioData.static.connectors
  for (let connector of connectors) {
    connector.static = true;
    model.currentScenario.staticConnectors.push(connector);
  }

  const dynamicNodes = scenarioData.dynamic
  let currentRowHeight = model.game.canvasHeight;

  //
  let currentRowWidth = 20;
  const nodeSpacing = 10;
  const maxWidth = model.game.canvasWidth - 40; // Leave margins
  
  for (let node of dynamicNodes) {
    node.static = false;
    node.width = getNodeWidth(node);
    node.height = 60;
    model.currentScenario.dynamicNodesInMenu.push(node);
    
    if (currentRowWidth + node.width > maxWidth && currentRowWidth > 20) {
      currentRowHeight += 70;
      currentRowWidth = 20;


    }}
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
    if(model.game.currentScenario < model.ScenarioLevels.length-1){
        model.game.currentScenario += 1;
        boxes = processBoxes(); //henter nye bokser fra the nye scenariet.
        loadScenario(); //oppdaterer teksten i view
        draw(); //tegner opp alt på nytt, siden nytt scenario er hentet
    } else {
        //Om det ikke er flere scenario, lag en alert box
        //alert("Ikke flere scenarioer!");
        showLinkToQuiz();
        
    }
    node.coordinates = {
    x: currentRowWidth,
    y: currentRowHeight
    };
    currentRowWidth += node.width + nodeSpacing;
    model.currentScenario.dynamicNodesInMenu.push(node);
    model.game.canvasHeight = currentRowHeight + 60;
    canvas.height = model.game.canvasHeight;
  }


  // for (let node of dynamicNodes) {
  //   node.static = false;
  //   node.width = getNodeWidth(node);
  //   node.height = 60;
  //   model.currentScenario.dynamicNodesInMenu.push(node);
  // }
  // Current 3:  if building=true: need a section to load in already used nodes and connectors


// Loads up end screen
function endScreen(){
    //Viser en alert box med link til quiz
    document.getElementById('scenarioTextHeader').innerHTML = /*html*/`
    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">All scenarios completed. Click here to take the quiz.</a>
    
    
  
    
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
  testResults = [];
  let results = [];

  // Henter korrekt løsning for nåværende scenario
  let correctSolution = model.ScenarioLevels[model.game.currentScenario].ScenarioSolution;

  // Sjekker om brukerens løsning er lik den riktige
  let isCorrect = JSON.stringify(currentUserSolution) === JSON.stringify(correctSolution);

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
exportPlayerProgressToCSV(true);
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



// Used to reset model.currentScenario
function resetCurrentScenario() {
    model.currentScenario = {
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
        tokens: []
    };
}

// Future x: widths and heigths can be determined in "aboutScenarios" in JSON input
// Sets node width
function getNodeWidth(node) {
  if (node.type !== 'activity') {
    return 60
  }

  // Returns either a minimum width or text width + 5 px maring on each side
  context.font = "14px Arial";
  const textWidth = context.measureText(node.name).width;
  const minWidth = 60;
  return Math.max(minWidth, textWidth + 10);
}

// Sets up the scenario on canvas
function deployScenario() {
  // Update Scenario Description
  document.getElementById('scenarioTextHeader').innerText = model.currentScenario.scenarioDescription;
  // Current 4: here is where we maybe add tutorialImage?
  draw()
}

// function setTaskDescription(results = [])
// {
//   let tokenTypes = mod
//   let passengerTypes = model.ScenarioLevels[model.game.currentScenario].ScenarioPassengerTypes;
//   let textObject = document.getElementById('taskText');
//   textObject.innerHTML = "";

//   for(let i = 0; i < passengerTypes.length; i++)
//       {
//         //Om vi har resultater som skal legges til hver linje i PassengerTypes, så legg dette til i HTML koden..
//         (results.length != 0) ? textObject.innerHTML += 
//         //.. Passasjertype beskrivelsen + resultatet. Om resultatet i listen er PASS, skal teksten være grønn, om ikke, så Rød. <br> er linebreak.
//         `${passengerTypes[i]} - ${(results[i] == "PASS") ? "<span style='color: green;'>PASS</span>" : "<span style='color: red;'>FAIL</span>"} </span> <br>` 
//         : textObject.innerHTML += `${passengerTypes[i]} <br>`;
//         console.log(results);
//       }
// }

