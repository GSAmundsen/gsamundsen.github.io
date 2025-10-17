//Globale vars
let canvas = null;
let context = null;
let boxes = [];

async function initCanvas() 
{
    const scenarioData = await loadScenarioJSON('scenarioData/scenario.json')

    model.loadedScenarioData = scenarioData;
    loadGameData();

  //Henter canvas elementet, laget i view.js, og setter bredde, høyde og farge
    canvas = document.getElementById('BPMNcanvas');
    context = canvas.getContext('2d');
    context.canvas.width = model.game.canvasWidth;
    context.canvas.height = model.game.canvasHeight;
    context.fillStyle = model.staticProperties.canvasBackgroundColor;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);

    // Legger til listeners, slik at funksjoner blir kalt ved musehendelser ('intern event systemet henter', funksjonen som skal kalles)
    canvas.addEventListener('mousedown', mouseDown);
    canvas.addEventListener('mousemove', mouseMove);
    canvas.addEventListener('mouseup', mouseUp); 
    console.log(canvas);

    //Laster inn all data, så kaller draw();
    const scenario = findScenario
    loadScenario(scenario);
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

function findScenario(){
  // If there is a current scenario it is marked as finished
  if (model.game.currentScenario !== null) {
    model.game.finishedScenarios.push(model.game.currentScenario);
  }

  // Check if all scenarios are completed
  if (model.game.finishedScenarios.length >= model.game.numberOfScenarios){
    return 0;
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
  if (scenario === 0) {
    // send player to after game screen
  }
  // preserves old scenario data if scenarios are building and wipes currentScanrio clean
  if (model.game.building === true) {
    const lastScenario = model.currentScenario
  }
  resetCurrentScenario();


  // loads in new scenario data
  const scenarioData = model.loadedScenarioData.scenarios[scenario];

  model.currentScenario.scenarioTitle = scenarioData.scenarioTitle
  model.currentScenario.scenarioDescription = scenarioData.scenarioDescription
  model.currentScenario.tutorialImage = scenarioData.tutorialImage
  model.currentScenario.failureImage = scenarioData.failureImage

  const tokens = scenarioData.tokens
  for (let token of tokens) {
    const tokenInstance = new Token(token);
    model.currentScenario.tokens.push(tokenInstance);
  }

  const pools = scenarioData.static.pools
  for (let pool of pools) {
    const poolInstance = new Pool(pool);
    model.currentScenario.pools.push(poolInstance);
  }

  const lanes = scenarioData.static.lanes
  for (let lane of lanes) {
    const laneInstance = new Lane(lane);
    model.currentScenario.lanes.push(laneInstance);
  }

  const nodes = scenarioData.static.nodes
  for (let node of nodes) {
    const nodeInstance = new Node(node);
    model.currentScenario.staticNodes.push(nodeInstance);
  }

  const connectors = scenarioData.static.connectors
  for (let connector of connectors) {
    const connectorInstance = new Connector(connector);
    model.currentScenario.staticConnectors.push(connectorInstance);
  }

  const dynamicNodes = scenarioData.dynamic
  for (let node of dynamicNodes) {
    const nodeInstance = new Node(node);
    model.currentScenario.dynamicNodesInMenu.push(nodeInstance);
  }
    
  
  //Scenario data fra JSON må lastes inn her.


    //Om scenariodata fra JSON IKKE skal lastes inn i modellen, må det endres HVOR systemet henter data fra.
    //Jeg tenker at aller helst bør man ha en mellomlagring, som enten tar inn JSON data, eller henter fra modellen. 
    //Så kan systemet bruke denne mellomlagringen som "kilde" for å hente data til view og controller.

    //Henter info fra modellen, og oppdaterer view. Her henter den teksten for det nåværende scenarioet
    document.getElementById('scenarioTextHeader').innerText = model.ScenarioLevels[model.game.currentScenario].scenarioDescription;

    // Henter bokser fra modellen...
    boxes = processBoxes(); //henter bokser fra modellen, og kalkulerer x posisjon for boksene


    //Når alt er lastet, tegn opp alt.
    draw()
}

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


// ...etter å ha kalkulert x posisjon for boksene, basert på antall bokser slik at de spres utover
function processBoxes(){
    //Vi bruker "currentScenario" som en "level teller". Scenario 0 referer da til både første scenario, og index 0 i listen av scenarioer
    let boxes = model.ScenarioLevels[model.game.currentScenario].BoxesList; 
    let nextXpos = 0;
    for (let i = 0; i < boxes.length; i++) {
        //Bruker bredden på forrige boks (om denne boksen ikke er index 0), for å regne ut neste x posisjon, pluss litt padding, sprer boksene
        (i == 0) ? nextXpos +=20 : nextXpos += boxes[i-1].w+20; //Forenklet if statement, "om i er 0, så legg til 20, ellers legg til bredden på forrige boks + 20px"
        boxes[i].x = nextXpos 
        } 
        console.log("Boxes processed: ", boxes);
    return boxes;
}

//Globale variabler som brukes til å holde styr på hvilken boks som dras, og offset for å få riktig posisjon
let draggingBox = null;
let offsetX = 0;
let offsetY = 0;

//Sletter canvas, og tegner opp alt på nytt. Kalles hovedsakelig når musen flyttes (mouseMove())
function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    //Går gjennom alle boksene i array, og tegner dem
    for (let box of boxes) {
        // Tegner boksen først
        console.log("Drawing box at "+box.x+","+box.y);
        context.fillStyle = box.color;
        context.fillRect(box.x, box.y, box.w, box.h);
        
        //..så teksten, ellers havner teksten under boksen, kanskje legge dette i CSS?
        context.fillStyle = "black";
        context.font = "14px Arial";  
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(box.text, box.x + box.w / 2, box.y + box.h / 2); //Teksten i midten av boksen
  }
}

//Når brukeren trykker ned musen...
function mouseDown(e) {
    const rect = canvas.getBoundingClientRect(); //Finner posisjon av canvas i forhold til vinduet
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    console.log(rect);
    

  // Sjekker om brukeren klikker "innenfor" en boks, kanskje det finns en bedre måte?
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (
            mouseX > b.x &&
            mouseX < b.x + b.w &&
            mouseY > b.y &&
            mouseY < b.y + b.h
        ) 
      {
        //Nå riktig boks, i listen av alle boksene i dette scenarioet er funnet, settes dette "draggingBox"
        draggingBox = b;
        console.log("Started dragging box: ", b);
        //får riktig posisjon på boksen i forhold til musen, sånn at musen holder seg der man trykket, og ikke på 0,0 ift boks (kosmetisk)
        offsetX = mouseX - b.x;
        offsetY = mouseY - b.y;
        break;
      }
  }
};

//Hver gang musen flyttes, og en boks er "dragging", oppdateres posisjonen til boksen
function mouseMove(e) {
  if (!draggingBox) return;// om ingen boks skal dras, gjør ingenting
  
  const rect = canvas.getBoundingClientRect();  //igjen, posisjon av canvas ift vindu
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  draggingBox.x = mouseX - offsetX;
  draggingBox.y = mouseY - offsetY;

  draw(); //Tegn opp alt på nytt, for hver pixl musen flyttes
};

//Disse to kansellerer dragging når musen slippes eller utenfor canvas
function mouseUp(e) {
  draggingBox = null;
};

function mouseLeave(e) {
  draggingBox = null;
};


//Midlertidig, løsning, trykk "n" for å gå til neste scenario
document.addEventListener('keydown', (event) => {
    if (event.key === "n") {
        nextScenario();
    }});


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
}

//Viser link til quiz, etter siste scenario
function showLinkToQuiz(){
    //Viser en alert box med link til quiz
    document.getElementById('scenarioTextHeader').innerHTML = /*html*/`
    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ" target="_blank">All scenarios completed. Click here to take the quiz.</a>
    
    
  
    
    `; 
}

