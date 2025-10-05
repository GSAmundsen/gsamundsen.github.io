//Globale vars
let canvas = null;
let context = null;

function initCanvas() 
{
    canvas = document.getElementById('BPMNcanvas');
    context = canvas.getContext('2d');
    context.canvas.width = model.canvasProperties.width;
    context.canvas.height = model.canvasProperties.height;
    context.fillStyle = model.canvasProperties.backgroundColor;
    context.fillRect(0, 0, model.canvasProperties.width, model.canvasProperties.height);

    // Legger til listeners, slik at funksjoner blir kalt ved musehendelser
    canvas.addEventListener('mousedown', mouseDown);
    canvas.addEventListener('mousemove', mouseMove);
    canvas.addEventListener('mouseup', mouseUp); 
    console.log(canvas);

    loadScenario();
    draw(); //Tegn opp alt (på nytt)
}

function loadScenario(){
    //Henter info fra model, og oppdaterer view
    document.getElementById('scenarioTextHeader').innerText = model.ScenarioLevels.scenarioDescription;
}

// Henter bokser fra modellen...
let boxes = processBoxes();

// ...etter å ha kalkulert x posisjon for boksene, basert på antall bokser slik at de spres utover
function processBoxes(){
    let boxes = model.ScenarioLevels.BoxesList;
    for (let i = 0; i < boxes.length; i++) {
        boxes[i].x = (i*150)+50;}
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
    for (const box of boxes) {
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

//if(canvas != null){draw();}


