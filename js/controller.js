//Globale vars
let canvas = null;
let context = null;
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



async function initCanvas() 
{
  // Loads game data
  const scenarioData = await loadScenarioJSON('scenarioData/scenario.json')
  model.loadedScenarioData = scenarioData;
  loadGameData();

  // Prepares canvas element
  canvas = document.getElementById('BPMNcanvas');
  context = canvas.getContext('2d');
  context.canvas.width = model.campaign.canvasWidth;
  context.canvas.height = model.campaign.canvasHeight;
  context.fillStyle = model.staticProperties.canvasBackgroundColor;
  context.fillRect(0, 0, context.canvas.width, context.canvas.height);

  // Adds canvas and document listeners
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mouseup', mouseUp);
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener('keydown', handleKeyPress);

  // Loads and deploys scenario data
  newScenario();
}

// Loads objects from loadedScenarioData into model.campaign
function loadGameData(){
  const gameData = model.loadedScenarioData.aboutCampaign;
  model.campaign.numberOfScenarios = gameData.numberOfScenarios;
  model.campaign.mainTitle = gameData.mainTitle;
  model.campaign.moduleDescription = gameData.moduleDescription;
  model.campaign.sequential = gameData.sequential;
  model.campaign.building = gameData.building;
  model.campaign.canvasWidth = gameData.canvasSize.width;
  model.campaign.canvasHeight = gameData.canvasSize.height;
  model.campaign.followUpCampaign = gameData.followUpCampaign;
  model.campaign.endScreenText = gameData.endScreenText;
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
  draw();
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
    return;
  }

  // Vanlig flytting av bokser
  if (!draggingBox) return;
  draggingBox.coordinates.x = mouseX - offsetX;
  draggingBox.coordinates.y = mouseY - offsetY;
  draw();
}

// Når musen slippes
// When mouse is released (finishing a connection)
function mouseUp(e) {
  if (connecting && startNode) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const allNodes = getNodes();
    const allConnectors = getConnectors();

    for (let node of allNodes) {
      const withinNode =
        mouseX > node.coordinates.x &&
        mouseX < node.coordinates.x + node.width &&
        mouseY > node.coordinates.y &&
        mouseY < node.coordinates.y + node.height;

      // Make sure we're connecting to a different node
      if (withinNode && node !== startNode) {
        // === Create new connector object ===
        const connector_id = `connector_${allConnectors.length + 1}`;
        const newConn = {
          type: "sequenceFlow",
          connectorId: connector_id,
          fromNodeId: startNode.nodeId,
          toNodeId: node.nodeId,
        };

        switch (startNode.type) {
      
          case "xorGateway": {
            startNode.nodeConnections = startNode.nodeConnections || [];

            if (startNode.nodeConnections.length >= 2) {
              break;
            }

            const conditionFlag = startNode.nodeConnections.length === 0 ? true : false;

            startNode.nodeConnections.push({
              connectorId: connector_id,
              condition: conditionFlag,
            });

            model.currentScenario.dynamicConnectors.push(newConn);
            break;
          }

          case "andGateway": {
            startNode.nodeConnections = startNode.nodeConnections || [];
            startNode.nodeConnections.push({ connectorId: connector_id });
            model.currentScenario.dynamicConnectors.push(newConn);
            break;
          }

          case "orGateway": {
            startNode.nodeConnections = startNode.nodeConnections || [];
            startNode.functions = startNode.functions || [];

            const index = startNode.nodeConnections.length;

            if (index >= startNode.functions.length) {
              break;
            }

            startNode.nodeConnections.push({
              connectorId: connector_id,
              functionIndex: index,
            });

            model.currentScenario.dynamicConnectors.push(newConn);
            break;
          }

          default: {
            const exists = allConnectors.some(
              (c) =>
                (c.fromNodeId === newConn.fromNodeId &&
                  c.toNodeId === newConn.toNodeId) ||
                (c.fromNodeId === newConn.toNodeId &&
                  c.toNodeId === newConn.fromNodeId)
            );

            if (!exists) {
              model.currentScenario.dynamicConnectors.push(newConn);
            }
            break;
          }
        }
      }
    }

    // Cleanup after drawing
    connecting = false;
    startNode = null;
    draw();
  }

  draggingBox = null;
}


function mouseLeave(e) {
  draggingBox = null;
};

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
  model.campaign.canvasHeight = model.loadedScenarioData.aboutCampaign.canvasSize.height
  const scenario = findScenario();
  loadScenario(scenario);
  if (scenario !== -1) {
    deployScenario();
  }
}

// Finds the current scenario to run using model.finishedScenarios and model.numberOfScenarios
function findScenario(){
  // If there is a current scenario it is marked as finished
  if (model.campaign.currentScenario !== null) {
    model.campaign.finishedScenarios.push(model.campaign.currentScenario);
  }

  // Check if all scenarios are completed
  if (model.campaign.finishedScenarios.length >= model.campaign.numberOfScenarios){
    return -1;
  }

  // Sequential mode: next scenario in order
  if (model.campaign.sequential){
    return model.campaign.finishedScenarios.length;
  }

  // Non-sequential: pick random unfinished scenario
  let availableScenarios = []
  for (let i = 0; i < model.campaign.numberOfScenarios; i++) {
    const scenarioId = `scenario_${i}`
    if (!model.campaign.finishedScenarios.includes(scenarioId)) {
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
    context.clearRect(0, 0, canvas.width, canvas.height);
    endScreen();
    return;
  }
  model.campaign.currentScenario = scenario;
  // Preserves old scenario data if scenarios are building then wipes currentScenario clean
  if (model.campaign.building === true) {
    const lastScenario = model.currentScenario
    // Pull out dynamic nodes on canvas and connectors + static nodes
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

  const pools = scenarioData.static.pools || [];
  for (let pool of pools) {
    model.currentScenario.pools.push(pool);
  }

  const lanes = scenarioData.static.lanes || [];
  for (let lane of lanes) {
    model.currentScenario.lanes.push(lane);
  }

  const nodes = scenarioData.static.nodes || [];
  for (let node of nodes) {
    node.static = true;
    node.width = getNodeWidth(node);
    node.height = 60;
    model.currentScenario.staticNodes.push(node);
  }

  const connectors = scenarioData.static.connectors || [];
  for (let connector of connectors) {
    connector.static = true;
    model.currentScenario.staticConnectors.push(connector);
  }

  const dynamicNodes = scenarioData.dynamic || [];
  // Here is where you have a sorting function to find which nodes are staying if building
  // Once those are sorted you immediately also sort out the connections you need to keep

  let currentRowHeight = model.campaign.canvasHeight;
  let currentRowWidth = 20;
  const nodeSpacing = 10;
  const maxWidth = model.campaign.canvasWidth - 40; // Leave margins
  
  for (let node of dynamicNodes) {
    node.static = false;
    node.width = getNodeWidth(node);
    node.height = 60;
    
    if (currentRowWidth + node.width > maxWidth && currentRowWidth > 20) {
      currentRowHeight += 70;
      currentRowWidth = 20;
    }
    node.coordinates = {
    x: currentRowWidth,
    y: currentRowHeight
    };
    currentRowWidth += node.width + nodeSpacing;
    model.currentScenario.dynamicNodesInMenu.push(node);
  }
  model.campaign.canvasHeight = currentRowHeight + 60;
  canvas.height = model.campaign.canvasHeight;

  // Now you load in the previously existing nodes on canvas and then the connectors


  // Current 3:  if building=true: need a section to load in already used nodes and connectors
}

// Loads up end screen
function endScreen(){
    // Current x: implement it showing teh endScreenText and a button asking whether you want to load nextCampaign(if there is one)

    //Viser en alert box med link til quiz
    document.getElementById('scenarioTextHeader').innerHTML = /*html*/`
    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">All scenarios completed. Click here to take the quiz.</a>
    
    
  
    
    `; 
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
//   let passengerTypes = model.ScenarioLevels[model.campaign.currentScenario].ScenarioPassengerTypes;
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

// Called upon scenario initaition and mouse movement. Deletes the whole canvas and then redraws it.
function draw() {
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