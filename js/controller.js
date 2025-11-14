// Global canvas variables
let canvas = null;
let context = null;

// Global box variables
let draggingBox = null;
let offsetX = 0;
let offsetY = 0;
let currentSelectedBox = null;

// Global connection variables
let connecting = false;
let startNode = null;
let tempLineEnd = { x: 0, y: 0 };
let connectorCounter = 1;
let menuCells = [];


// Gerry
//mellomlagrer brukerens løsning. I denne foreløpige løsningen, lagres KUN transitions mellom bokser.
let currentUserSolution = []; 
let testResults = []; //List of strings, PASS or FAIL. Index needs to match the corresponding entry in ScenarioPassengerTypes and ScenarioSolutions


async function initCanvas() 
{
  // Loads game data
  const scenarioData = await loadScenarioJSON('scenarioData/scenario.json')
  model.loadedScenarioData = scenarioData;

  //Gets the canvas element, laget i view.js, og setter bredde, høyde og farge
  canvas = document.getElementById('BPMNcanvas');
  context = canvas.getContext('2d');
  context.canvas.width = model.canvasProperties.width;
  context.canvas.height = model.canvasProperties.height + 100;
  context.fillStyle = model.canvasProperties.backgroundColor;
  context.fillRect(0, 0, model.canvasProperties.width, model.canvasProperties.height);

  //Adds key listeners,
  // Legger til listeners, slik at funksjoner blir kalt ved musehendelser ('intern event systemet henter', funksjonen som skal kalles)
  canvas.addEventListener('mousedown', mouseDown);
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mouseup', mouseUp); 

  canvas.addEventListener("contextmenu", (e) => e.preventDefault()); //prevents context menu when right clicking (creating connections)

  document.addEventListener('keydown', (e) => {if(e.key == 'Delete'){ resetConnections(); }});

  // Loads and deploys scenario data
  loadGameData();
  loadScenarioInformation();
  loadScenarioData();
  draw();
}

// Loads information from loadedScenarioData into model.game
function loadGameData(){
  const gameData = model.loadedScenarioData.aboutCampaign;
  model.game.numberOfScenarios = gameData.numberOfScenarios;
  model.game.moduleTitle = gameData.moduleTitle;
  model.game.moduleDescription = gameData.moduleDescription;
  model.game.endScreenText = gameData.endScreenText;
}

// Loads game and sceanrioinformation on top of page
function loadScenarioInformation(){
  document.getElementById('moduleTitleHeader').innerText = model.game.moduleTitle;
  document.getElementById('moduleTextHeader').innerText = model.game.moduleDescription;
  document.getElementById('taskText').innerText =
    model.loadedScenarioData.scenarios[model.game.currentScenario].scenarioTitle + "\n" +
    model.loadedScenarioData.scenarios[model.game.currentScenario].scenarioDescription
}

// Loads information from loadedScenarioData into model.currentScenario and sets coordinates/sizes of elements
function loadScenarioData(){
  const scenario = model.loadedScenarioData.scenarios[model.game.currentScenario]
  model.currentScenario.pools = loadStaticElements(scenario.static.pools);
  model.currentScenario.lanes = loadStaticElements(scenario.static.lanes);
  model.currentScenario.tokens = scenario.tokens;

  // model.currentScenario.failureDescriptions = model.currentScenario.failureDescriptions || {};

  if (scenario.resetCanvas) {
    menuCells = [];
    model.currentScenario.nodes = processNodes(scenario.nodes);
    model.currentScenario.failureDescriptions = scenario.failureDescriptions || {};
    model.currentScenario.connectors = [];
  } else {
    model.currentScenario.nodes = [
      ...model.currentScenario.nodes,
      ...processNodes(scenario.nodes)
    ];
    model.currentScenario.failureDescriptions = {
      ...model.currentScenario.failureDescriptions,
      ...scenario.failureDescriptions
    };
  }

  // Handle endEvent
  let endEvent = model.currentScenario.nodes.find(n => n.type === "endEvent");

  if (!endEvent) {
    // Create and process through processNodes
    const tempEndEvent = [{
      type: "endEvent",
      name: "End",
      nodeId: "node_end",
      functions: []
    }];
    
    const [processedEndEvent] = processNodes(tempEndEvent);
    model.currentScenario.nodes.push(processedEndEvent);
    endEvent = processedEndEvent;
  }

  // Append checks
  endEvent.functions = [
    ...(endEvent.functions || []),
    ...(scenario.endEventChecks || [])
    ];
}

// Scales pool/lane according to dynaic canvas size
function loadStaticElements(elements) {
  return elements.map(element => ({
    ...element,
    coordinates: {
      x: scaleCoordinate(element.coordinates.x, 'x'),
      y: scaleCoordinate(element.coordinates.y, 'y')
    },
    size: {
      width: scaleCoordinate(element.size.width, 'width'),
      height: scaleCoordinate(element.size.height, 'height')
    }
  }));
}

function scaleCoordinate(coord, dimension) {
  if (dimension === 'x' || dimension === 'width') {
    return (coord / model.referanceCanvas.width) * model.canvasProperties.width;
  } else {
    return (coord / model.referanceCanvas.height) * model.canvasProperties.height;
  }
}

function processNodes(scenarioNodes) {
  const processed = [];
  const CELL_WIDTH = 140;
  const CELL_HEIGHT = 100;
  const START_X = 50;
  const BASE_HEIGHT = model.canvasProperties.height;
  const MENU_START_Y = BASE_HEIGHT;
  const CELLS_PER_ROW = Math.floor((canvas.width - START_X) / CELL_WIDTH);
  
  if (menuCells.length > 0) {
    for (const node of model.currentScenario.nodes || []) {
      if (node.coordinates?.y >= MENU_START_Y - 10) {
        const cellX = Math.floor((node.coordinates.x - START_X) / CELL_WIDTH);
        const cellY = Math.floor((node.coordinates.y - MENU_START_Y) / CELL_HEIGHT);
        const cellIndex = cellY * CELLS_PER_ROW + cellX;
        menuCells[cellIndex] = true;
      }
    }
  }
  
  let cellIndex = 0;
  let maxRow = 0;
  
  for (const node of scenarioNodes) {
    const processedNode = { ...node };
    
    if (node.type === "activity") {
      processedNode.width = 120;
      processedNode.height = 80;
    } else {
      processedNode.width = 60;
      processedNode.height = 60;
    }
    
    if (node.coordinates) {
      processedNode.coordinates = {
        x: scaleCoordinate(node.coordinates.x, 'x'),
        y: scaleCoordinate(node.coordinates.y, 'y')
      };
    } else {
      while (menuCells[cellIndex]) cellIndex++;
      
      const row = Math.floor(cellIndex / CELLS_PER_ROW);
      const col = cellIndex % CELLS_PER_ROW;
      
      maxRow = Math.max(maxRow, row);
      
      // Center smaller nodes in cell
      const xOffset = (CELL_WIDTH - processedNode.width) / 2;
       
      processedNode.coordinates = {
        x: START_X + (col * CELL_WIDTH) + xOffset,
        y: MENU_START_Y + (row * CELL_HEIGHT)
      };
      
      menuCells[cellIndex] = true;
      cellIndex++;
    }
    
    processed.push(processedNode);
  }
  
  // Adjust canvas height based on menu rows
  const menuRows = maxRow + 1;
  canvas.height = BASE_HEIGHT + (menuRows * CELL_HEIGHT);
  
  return processed;
}
// function processNodes(scenarioNodes) {
//   const processed = [];
//   const CELL_WIDTH = 140;
//   const CELL_HEIGHT = 100;
//   const START_X = 50;
//   const CELLS_PER_ROW = Math.floor((canvas.width - START_X) / CELL_WIDTH);
  
//   // Initialize tracking array
//   menuCells = []; // Clear previous
  
//   // Mark occupied cells
//   for (const node of model.currentScenario.nodes || []) {
//     if (node.coordinates?.y >= canvas.height - 200) { // Check expanded menu area
//       const cellX = Math.floor((node.coordinates.x - START_X) / CELL_WIDTH);
//       const cellY = Math.floor((canvas.height - node.coordinates.y) / CELL_HEIGHT);
//       const cellIndex = cellY * CELLS_PER_ROW + cellX;
//       menuCells[cellIndex] = true;
//     }
//   }
  
//   // Place nodes
//   let cellIndex = 0;
  
//   for (const node of scenarioNodes) {
//     const processedNode = { ...node };
    
//     if (node.type === "activity") {
//       processedNode.width = 120;
//       processedNode.height = 80;
//     } else {
//       processedNode.width = 60;
//       processedNode.height = 60;
//     }
    
//     if (node.coordinates) {
//       processedNode.coordinates = {
//         x: scaleCoordinate(node.coordinates.x, 'x'),
//         y: scaleCoordinate(node.coordinates.y, 'y')
//       };
//     } else {
//       // Find next free cell
//       while (menuCells[cellIndex]) cellIndex++;
      
//       const row = Math.floor(cellIndex / CELLS_PER_ROW);
//       const col = cellIndex % CELLS_PER_ROW;
      
//       processedNode.coordinates = {
//         x: START_X + (col * CELL_WIDTH),
//         y: canvas.height - 95 - (row * CELL_HEIGHT)
//       };
      
//       menuCells[cellIndex] = true;
//       cellIndex++;
//     }
    
//     processed.push(processedNode);
//   }
  
//   return processed;
// }
// // Sets coordinates and sizes of nodes
// function processNodes(scenarioNodes) {
//   const processed = [];
//   let menuX = canvas.width / 3;
  
//   for (const node of scenarioNodes) {
//     const processedNode = { ...node };
    
//     if (node.type === "activity") {
//       processedNode.width = 120;
//       processedNode.height = 80;
//     } else {
//       processedNode.width = 60;
//       processedNode.height = 60;
//     }
    
//     if (node.coordinates) {
//       processedNode.coordinates = {
//         x: scaleCoordinate(node.coordinates.x, 'x'),
//         y: scaleCoordinate(node.coordinates.y, 'y')
//       };
//     } else {
//       processedNode.coordinates = {
//         x: menuX,
//         y: canvas.height - 95
//       };
//       menuX += processedNode.width + 10;
//     }
    
//     processed.push(processedNode);
//   }
  
//   return processed;
// }

// Called upon scenario initaition and mouse movement. Deletes the whole canvas and then redraws it.
function draw() {
  // clear the canvas every update, prevents "drawing" when dragging
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Draw order to create correct visual
  drawPools(model.currentScenario.pools);
  drawLanes(model.currentScenario.lanes);
  connectorCoordinates(model.currentScenario.connectors);
  drawNodes(model.currentScenario.nodes);
  drawTemporaryArrow();
}

//Loads the next scenario
function nextScenario() {
  if (model.game.currentScenario < model.game.numberOfScenarios - 1) {
    model.game.currentScenario += 1;
    loadScenarioInformation();
    loadScenarioData();
    draw();
  } else {
    // showLinkToQuiz(); - handle later
  }
}

// Når brukeren trykker ned musen
function mouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  currentSelectedBox = null; //Om vi trykker andre steder enn på en boks, så nullstill slik at vi ikke har en boks valgt.
  const allNodes = model.currentScenario.nodes
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
  // If connecting
  if (connecting && startNode) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    for (let node of model.currentScenario.nodes) {
      if (
        mouseX > node.coordinates.x && mouseX < node.coordinates.x + node.width &&
        mouseY > node.coordinates.y && mouseY < node.coordinates.y + node.height &&
        node !== startNode
      ) {
        // Create connector
        const connector_id = `connector_${connectorCounter++}`;
        const newConn = {
          connectorId: connector_id,
          fromNodeId: startNode.nodeId,
          toNodeId: node.nodeId
        };

        // Check if connection already exists
        if (!model.currentScenario.connectors.some(c => 
          (c.fromNodeId === newConn.fromNodeId && c.toNodeId === newConn.toNodeId) ||
          (c.fromNodeId === newConn.toNodeId && c.toNodeId === newConn.fromNodeId)
        )) {
          
          // Gateway-specific logic
          switch (startNode.type) {
            case "xorGateway": {
              startNode.nodeConnections = startNode.nodeConnections || [];
              
              if (startNode.nodeConnections.length >= 2) {
                break; // XOR max 2 connections
              }
              
              startNode.nodeConnections.push({
                connectorId: connector_id,
                condition: startNode.nodeConnections.length === 0 // First=true, second=false
              });
              
              model.currentScenario.connectors.push(newConn);
              break;
            }
            
            case "andGateway": {
              startNode.nodeConnections = startNode.nodeConnections || [];
              startNode.nodeConnections.push({ connectorId: connector_id });
              model.currentScenario.connectors.push(newConn);
              break;
            }
            
            case "inclusiveGateway": {
              startNode.nodeConnections = startNode.nodeConnections || [];
              startNode.functions = startNode.functions || [];
              
              const index = startNode.nodeConnections.length;
              
              if (index >= startNode.functions.length) {
                break; // Can't exceed defined functions
              }
              
              startNode.nodeConnections.push({
                connectorId: connector_id,
                functionIndex: index
              });
              
              model.currentScenario.connectors.push(newConn);
              break;
            }
            
            default: {
              // Regular nodes - just add connector
              model.currentScenario.connectors.push(newConn);
            }
          }
        }
        break;
      }
    }
    
    connecting = false;
    startNode = null;
    draw();
  }

  draggingBox = null;
}


function resetConnections(resetAll = false) {
  if (resetAll) {
    model.currentScenario.connectors = [];
    for (const node of model.currentScenario.nodes) {
      if (node.type.includes("Gateway")) {
        node.nodeConnections = [];
      }
    }
    draw();
    return;
  }

  if (model.currentScenario.connectors.length === 0) return;

  let deletedIds = [];

  if (currentSelectedBox != null) {
    // Collect IDs being deleted
    deletedIds = model.currentScenario.connectors
      .filter(c => c.fromNodeId === currentSelectedBox.nodeId || c.toNodeId === currentSelectedBox.nodeId)
      .map(c => c.connectorId);
    
    // Delete connectors
    model.currentScenario.connectors = model.currentScenario.connectors.filter(conn => 
      conn.fromNodeId !== currentSelectedBox.nodeId && 
      conn.toNodeId !== currentSelectedBox.nodeId
    );
  } else {
    // Delete last
    const deleted = model.currentScenario.connectors.pop();
    deletedIds = [deleted.connectorId];
  }

  // Clean gateway nodeConnections
  for (const node of model.currentScenario.nodes) {
    if (node.type.includes("Gateway") && node.nodeConnections) {
      node.nodeConnections = node.nodeConnections.filter(nc => 
        !deletedIds.includes(nc.connectorId)
      );
    }
  }


  draw();
}

// Loads up end screen
function endScreen(){
    // Current x: implement it showing teh endScreenText and a button asking whether you want to load nextCampaign(if there is one)

    //Viser en alert box med link til quiz
    document.getElementById('scenarioTextHeader').innerHTML = /*html*/`
    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">All scenarios completed. Click here to take the quiz.</a>
    
    
  
    
    `; 
}

//  STARTSPILL-FUNKSJON 
// Denne funksjonen kjører når brukeren trykker "Start spill"
function startGame() {

  updateView();


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
  console.log("Spiller-ID:", player.id);

  // Skjul login-seksjonen og vis spillet
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("app").style.display = "block";

  // Laster inn startverdi (quiz-score) og starter spillet
  loadQuizResult();

  initCanvas();

  // Oppdaterer visning av kunnskapsnivå
  updateLearningDisplay();
}