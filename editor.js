class DrawHandler {
	#svg = null
	#shapeHandler = null
	#finalShapes = []

	constructor(svg) {
		this.#svg = svg
		this.#svg.addEventListener('click', this.mouseClickHandler)
		this.#svg.addEventListener('mousemove', this.mouseMoveHandler)
	}

	getFinalShapes() {
		return this.#finalShapes
	}

	persistFinalShapeDetails(type, attributes) {
		this.#finalShapes.push({
			type,
			attributes
		})
	}

	setShapeHandler(shapeHandler) {
		if(this.#shapeHandler) this.#shapeHandler.cancelDrawingHandler()
		this.#shapeHandler = shapeHandler
	}

	mouseClickHandler(mouseEvent) {
		if(this.#shapeHandler) this.#shapeHandler.handleMouseClick(mouseEvent)
	}

	mouseMoveHandler(mouseEvent) {
		if(this.#shapeHandler) this.#shapeHandler.handleMouseMove(mouseEvent)
	}
}

class DrawShapeHandler {
	#drawHandler = null
	svg = null

	constructor(drawHandler, svg) {
		this.#drawHandler = drawHandler
		this.svg = svg
	}

	createSvgElement(name, attributes) {
		const element = document.createElementNS("http://www.w3.org/2000/svg", name)
		for(const key in attributes) element.setAttribute(key, attributes[key])
		return element
	}
	
	updateSvgAttributes(element, attributes) {
		for(const key in attributes) element.setAttribute(key, attributes[key])
	}
	
	getClosestGridPoint(point, subDiv) {
		const {x,y} = point
		const newX = Math.round(x / subDiv) * subDiv
		const newY = Math.round(y / subDiv) * subDiv
		return {
			x: newX,
			y: newY
		}
	}

	persistFinalShapeDetails(id, type, attributes) {
		this.#drawHandler.persistFinalShapeDetails(type, attributes)
	}

	cancelDrawingHandler() {} 
	handleMouseClick(mouseEvent) {}
	handleMouseMove(mouseEvent) {}
}

class DrawPolygonHandler extends DrawShapeHandler {
	#activeLine = null
	#activeLines = []
	#activeVertices = new Set()

	deleteAllLines() {
		for(const line of this.#activeLines) this.svg.removeChild(line)
	}

	cancelDrawingHandler() {
		this.deleteAllLines()
	}

	handleMouseClick(mouseEvent) {
		const {x, y} = this.getClosestGridPoint({x: mouseEvent.offsetX, y: mouseEvent.offsetY}, gridSubdiv)

		if(this.#activeLine) {
			// end current line but keep track of it
			this.updateSvgAttributes(this.#activeLine, {
				x2: x,
				y2: y
			})
			this.#activeLines.push(this.#activeLine)
			
			// check if the current line hasn't connected to a previous line
			const endingVertex = `${x} ${y}`
			if(!this.#activeVertices.has(endingVertex)) {
				// polygon hasn't been closed yet, keep track of the line's ending point
				this.#activeVertices.add(endingVertex)
			} else {
				// closed a shape! convert lines to a polygon and don't try to create another line
	
				this.deleteAllLines()
	
				// create polygon
				const id = generateGuid()
				const points = Array.from(this.#activeVertices).join(' ')
				const polygon = createSvgElement('polygon', {
					id,
					points,
					fill: '#000000'
				})
				this.svg.appendChild(polygon)
	
				// add click handler
				polygon.addEventListener('click', shapeClickHandler)
	
				this.persistFinalShapeDetails(id, 'polygon', {
					points,
					color: '#000000'
				})

				// stop processing (don't try to create the next line)
				return
			}
		}
		
		// always create a new line to connect to the previous
		this.#activeLine = createSvgElement('line', {
			x1: x,
			y1: y,
			x2: x,
			y2: y,
			stroke: 'black'
		})
		this.svg.appendChild(this.#activeLine)
		// keep track of the starting point
		this.#activeVertices.add(`${x},${y}`)
	}

	handleMouseMove(mouseEvent) {
		if(this.#activeLine) {
			updateSvgAttributes(this.#activeLine, {
				x2: mouseEvent.offsetX,
				y2: mouseEvent.offsetY
			})
		}
	}
}





function shapeClickHandler(event) {
	// if a polygon is already selected, deselect the previous one
	if(selectedPolygon) selectPolygon(selectedPolygon, false)
	selectedPolygon = event.srcElement
	selectPolygon(selectedPolygon, true)
}

function selectPolygon(polygon, selected) {
	updateSvgAttributes(polygon, {
		stroke: selected ? 'red' : null
	})
}

function setElementType(type) {
	elementType = type
	if(type == 'wall' || type == 'wall-sphere') elementColor = '#000000'
	if(type == 'gate') elementColor = '#0000FF'
	if(type == 'windstream') elementColor = '#A020F0'
	if(type == 'ball') elementColor = '#FF0000'
}

function handleCreateSphereClick(event) {
	if(activeSphere) {
		// end sphere
		const { cx: { baseVal: { value: cx } }, cy: { baseVal: { value: cy } } } = activeSphere
		const { offsetX, offsetY } = event

		let x = cx - offsetX;
		let y = cy - offsetY;
		const distance = Math.sqrt(x * x + y * y);

		updateSvgAttributes(activeSphere, {
			r: distance
		})

		// add click handler
		activeSphere.addEventListener('click', shapeClickHandler)

		const id = generateGuid()

		finalShapes.push({
			id,
			type: elementType,
			color: elementColor,
			sphere: {
				cx,
				cy,
				r: distance
			},
			shape: activeSphere
		})

		activeSphere = null
	} else {
		const {x, y} = getClosestGridPoint({x: event.offsetX, y: event.offsetY}, gridSubdiv)
		activeSphere = createSvgElement('circle', {
			cx: x,
			cy: y,
			r: 0,
			fill: elementColor
		})
		svg.appendChild(activeSphere)
	}
}

function handleCreateSphereMove(event) {
	if(activeSphere) {
		const { cx: { baseVal: { value: cx } }, cy: { baseVal: { value: cy } } } = activeSphere
		const { offsetX, offsetY } = event

		let x = cx - offsetX;
		let y = cy - offsetY;
		const distance = Math.sqrt(x * x + y * y);

		updateSvgAttributes(activeSphere, {
			r: distance
		})
	}
}


let elementType = null
let elementColor = null
// start with wall element types by default
setElementType('wall')

let activeLine = null
let activeSphere = null
let activeLines = []
let activeVertices = []
let uniqueVerts = new Set()
const finalShapes = []
let selectedPolygon = null

svg.addEventListener('click', (event) => {
	if(['wall-sphere','ball'].indexOf(elementType) != -1) handleCreateSphereClick(event)
	if(['wall','gate','windstream'].indexOf(elementType) != -1) handleCreateLineClick(event)
})

svg.addEventListener('mousemove', (event) => {
	if(['wall-sphere','ball'].indexOf(elementType) != -1) handleCreateSphereMove(event)
})

document.addEventListener('keydown', (event) => {
	if(event.key == "Escape" && activeLine) {
		svg.removeChild(activeLine)
		activeLine = null
	} else if (event.key == "Escape" && selectedPolygon) {
		selectPolygon(selectedPolygon, false)
		selectedPolygon = false
	}
})