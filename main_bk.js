// setup canvas

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
ctx.filter = 'blur(4px)';

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

function initWindow() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

function matmul(m1, m2) {
  var result = [];
  for (var i = 0; i < m1.length; i++) {
      result[i] = [];
      for (var j = 0; j < m2[0].length; j++) {
          var sum = 0;
          for (var k = 0; k < m1[0].length; k++) {
              sum += m1[i][k] * m2[k][j];
          }
          result[i][j] = sum;
      }
  }
  return result;
}

class ControlPoint {
  constructor(x, y, parent=null, child=null) {
    this.x = x;
    this.y = y;
    this.color = 'yellow';
    this.lineColor = 'yellow';
    this.size = 10;
    this.parent = parent;
    this.child = child;
    // this.selected = selected;
  }
  remove() {
    if(this.child) this.child.parent = this.parent;
    if(this.parent) this.parent.child = this.child;
  }
  addChild(cp) {
    this.child = cp;
  }
  draw() {
    ctx.beginPath();  // state that we want to draw
    ctx.strokeStyle = this.color;
    ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
    ctx.stroke();  
  }
  draw_head() {
    ctx.beginPath();  // state that we want to draw
    ctx.strokeStyle = 'orange';
    ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
    ctx.stroke();  
  }
  draw_selected() {
    ctx.beginPath();  // state that we want to draw
    ctx.fillStyle = this.color;
    ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
    ctx.fill();
  }
  draw_selected_head() {
    ctx.beginPath();  // state that we want to draw
    ctx.fillStyle = 'orange';
    ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
    ctx.fill();
  }

  draw_line() {
    if(this.child == null) return;
    ctx.beginPath();
    ctx.strokeStyle = this.lineColor;
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.child.x, this.child.y);
    ctx.stroke();
  }
}

class ControlPointList {
  constructor(head = null) {
    this.head = head;
  }

  draw_points() {
    let cp = this.head;
    while(cp){
      if(cp==controlPointList.head) {
        if(cp == current_cp) cp.draw_selected_head();
        else cp.draw_head();
      } else if(cp==current_cp) cp.draw_selected();
      else cp.draw();
      cp = cp.child;
    }
  }
  draw_line_interpolation() {
    let cp = this.head;
    while(cp){
      cp.draw_line();
      cp = cp.child;
    }
  
  }
  draw_bezier_interpolation() {
    let p0, p1, p2, p3;
    let x0, y0, x1, y1;
    let linspace = 1/100;

    for(let i = 0; i < n_cp/3-1; i++) {
      if(i==0) p0 = this.head;
      else p0 = p3;
      p1 = p0.child;
      p2 = p1.child;
      p3 = p2.child;
      
      [x0, y0] = [p0.x, p0.y];
      for(let t=linspace; t<1+linspace; t+=linspace){
        ctx.beginPath();
        ctx.strokeStyle = p0.lineColor;
        x1 = (1-t)**3 * p0.x + 3*t*(1-t)**2 * p1.x + 3*t**2*(1-t) * p2.x + t**3 * p3.x;
        y1 = (1-t)**3 * p0.y + 3*t*(1-t)**2 * p1.y + 3*t**2*(1-t) * p2.y + t**3 * p3.y;
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        [x0,y0] = [x1,y1];
      }
    }
  }

  draw_spline_interpolation(spline_at_t) {
    let p0, p1, p2, p3;
    let x0, y0, x1, y1;
    let linspace = 1/100;

    let points = [];
    for(let i = 0; i < (n_cp-3); i++) {
      if(i==0) p0 = this.head;
      else p0 = p1;
      p1 = p0.child;
      p2 = p1.child;
      p3 = p2.child;
      
      [x0, y0] = [p0.x, p0.y];
      for(let t=0; t<1; t+=linspace){
        [x1,y1] = spline_at_t(p0, p1, p2, p3, t);
        points.push([x1,y1]);
      }
    }
    if (points.length > 0)
      [x0,y0] = points[0];
    for(let i=1;i < points.length; i++){
      ctx.beginPath();
      ctx.strokeStyle = p0.lineColor;
      [x1,y1] = points[i]
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      [x0,y0] = [x1,y1];

    }
  }
  draw_bspline_interpolation() {
    this.draw_spline_interpolation(this.bspline_at_t);
  }
  draw_crspline_interpolation() {
    this.draw_spline_interpolation(this.crspline_at_t);
  }
  bspline_at_t(p0, p1, p2, p3, t){
    let M = [[-1/6, 3/6, -3/6, 1/6],
          [3/6, -6/6, 3/6, 0/6],
          [-3/6, 0/6, 3/6, 0/6],
          [1/6, 4/6, 1/6, 0/6]];
    let Q = matmul([[t**3, t**2, t, 1]], M)
    Q = matmul(Q, [[p0.x, p0.y],
                  [p1.x, p1.y],
                  [p2.x, p2.y],
                  [p3.x, p3.y]])
    return Q[0];
  }
  crspline_at_t(p0, p1, p2, p3, t){
    let M = [[-1/2, 3/2, -3/2, 1/2],
          [2/2, -5/2, 4/2, -1/2],
          [-1/2, 0/2, 1/2, 0/2],
          [0/2, 2/2, 0/2, 0/2]];
    let Q = matmul([[t**3, t**2, t, 1]], M)
    Q = matmul(Q, [[p0.x, p0.y],
                  [p1.x, p1.y],
                  [p2.x, p2.y],
                  [p3.x, p3.y]])
    return Q[0];

  }
  size() {
    let count = 0; 
    let node = this.head;
    while(node) {
      count++;
      node = node.child;
    }
    return count;
  }
  clear() {
    this.head = null;
  }
  getLast() {
    let lastNode = this.head;
    if (lastNode) {
      while (lastNode.child) {
        lastNode = lastNode.child;
      }
    }
    return lastNode;
  }
  getFirst() {
    return this.head;
  }
  remove(node) {
    if (node.parent) {
      node.parent.child = node.child;
    }
    if (node.child) {
      node.child.parent = node.parent;
    }
    if (node == this.head) {
      this.head = node.child;
    }
  }
}

const EMPTY = 0;
const NEW_CLICK = 1;
const SEL_CLICK = 2;
const SEL_THRESHOLD = 20;

let click_status = EMPTY;
let current_cp = null;
let parent_cp = null;

let controlPoints = [];
let controlPointList = new ControlPointList();
let n_cp = 0;

function selectControlPoint(x, y) {
  // optimize here
  let neaerst_d = SEL_THRESHOLD;
  nearest_cp = null;
  cp = controlPointList.head;
  while(cp){
    d = ((cp.x - x)**2 + (cp.y - y)**2)**0.5;
    if (d < neaerst_d){
      nearest_cp = cp;
      neaerst_d = d;
    }
    cp = cp.child;
  }
  return nearest_cp;
}


function init() {
  initWindow();
  ctx.fillStyle = 'rgba(0,0,0.25)';
  ctx.fillRect(0,0,width, height);
}
function updateCount(){
  document.getElementsByTagName('p')[0].textContent = "Number of ControlPoints: " 
  + n_cp;
}
function updateScreen() {
  init();
  controlPointList.draw_points();
  // controlPointList.draw_bezier_interpolation();
  // controlPointList.draw_bspline_interpolation();
  controlPointList.draw_crspline_interpolation();
  // controlPointList.draw_line_interpolation();
  updateCount();
}


let lastPoint = null;
canvas.onmousedown = function(e) {
  cp = selectControlPoint(e.offsetX, e.offsetY);
  if (cp == null) {
    click_status = NEW_CLICK;
    parent_cp = current_cp;
    child_cp = parent_cp ? parent_cp.child : null;
    current_cp = new ControlPoint(e.offsetX, e.offsetY, parent_cp, child_cp);
    parent_cp ? parent_cp.addChild(current_cp) : null;
    child_cp ? child_cp.parent = parent_cp : null;
    n_cp += 1;
    if (n_cp == 1) {
      controlPointList = new ControlPointList(current_cp);
    }
  } else {
    click_status = SEL_CLICK;
    current_cp = cp;
  }
  lastPoint = [e.offsetX, e.offsetY];
  updateScreen();
}
canvas.onmouseup = function(e) {
  click_status = EMPTY;
}
canvas.onmousemove = function(e) {
  if(click_status == EMPTY) {
    return;
  }
  else {
    current_cp.x += e.offsetX - lastPoint[0];
    current_cp.y += e.offsetY - lastPoint[1];
  }
  lastPoint = [e.offsetX, e.offsetY];
  updateScreen();
}

window.onkeydown = function(e) {
  console.log(e.key)
  if (e.key == 'x') {
    if (current_cp == null) return;
    // remove
    if(current_cp == controlPointList.head){
      controlPointList.head = current_cp.child;
    }
    parent_cp = current_cp.parent;
    current_cp.remove();
    current_cp = parent_cp;
    n_cp--;
  }
  updateScreen();
}

document.getElementsByTagName('body')[0].onresize = function() {
  updateScreen();
}

init();
