class Canvas {
	svg
	gridSubdiv
	#gridDots = []

	constructor(svg, gridSubdiv) {
		this.svg = svg
		this.gridSubdiv = gridSubdiv
		this.createDotGrid(svg, gridSubdiv)
	}

	getSvg() {
		return this.svg
	}

	getGridSubdivision() {
		return this.gridSubdiv
	}

	createDotGrid(svg, gridSubdiv=10) {
		// remove previous grid if it exists
		if(this.#gridDots.length > 0) {
			for(const dot of this.#gridDots) svg.removeChild(dot)
			this.#gridDots = []
		}

		const { height: { baseVal: { value: height }}, width: { baseVal: { value: width }}} = svg
		for(let h = 0; h <= height; h+=gridSubdiv) {
			for(let w = 0; w <= width; w+=gridSubdiv) {
				const dot = this.createSvgElement('circle', {
					class: 'dot',
					cx: w,
					cy: h,
					r: .5,
					fill: 'black'
				})
				this.#gridDots.push(dot)
				svg.appendChild(dot)
			}
		}
	}

	createSvgElement(name, attributes) {
		const element = document.createElementNS("http://www.w3.org/2000/svg", name)
		for(const key in attributes) element.setAttribute(key, attributes[key])
		return element
	}

	addSvgElement(element) {
		this.svg.appendChild(element)
	}

	removeSvgElement(element) {
		this.svg.removeChild(element)
	}

	updateSvgAttributes(element, attributes) {
		for(const key in attributes) element.setAttribute(key, attributes[key])
	}
}


class DrawHandler {
	#canvas
	#shapeHandler
	#eventsRegistered = false
	#persistShapeHandler

	constructor(canvas, persistShapeHandler) {
		this.#canvas = canvas
		this.#persistShapeHandler = persistShapeHandler
	}

	getCanvas() {
		return this.#canvas
	}

	getShapeHandler() {
		return this.#shapeHandler
	}

	persistFinalShapeDetails(id, type, attributes) {
		this.#persistShapeHandler({
			id,
			type,
			attributes
		})
	}

	cancelDrawing() {
		if(this.#shapeHandler) {
			this.#shapeHandler.cancelDrawingHandler()
		}
	}

	setShapeHandler(shapeHandler) {
		this.cancelDrawing()
		this.#shapeHandler = shapeHandler
		if(!this.#eventsRegistered) {
			this.#canvas.getSvg().addEventListener('click', this.mouseClickHandler(this))
			this.#canvas.getSvg().addEventListener('mousemove', this.mouseMoveHandler(this))
			this.#eventsRegistered = true
		}
	}

	mouseClickHandler(drawHandler) {
		return function(mouseEvent) {
			drawHandler.getShapeHandler().handleMouseClick(mouseEvent)
		}
	}

	mouseMoveHandler(drawHandler) {
		return function(mouseEvent) {
			drawHandler.getShapeHandler().handleMouseMove(mouseEvent)
		}
	}
}

class DrawShapeHandler {
	drawHandler = null
	constantAttributes = {}

	constructor(drawHandler, constantAttributes) {
		this.drawHandler = drawHandler
		this.constantAttributes = constantAttributes ? { ...constantAttributes } : {}
	}
	
	setConstantAttributes(attributes) {
		this.constantAttributes = { ...attributes }
	}

	getClosestGridPoint(point) {
		const subDiv = this.drawHandler.getCanvas().getGridSubdivision()
		const {x,y} = point
		const newX = Math.round(x / subDiv) * subDiv
		const newY = Math.round(y / subDiv) * subDiv
		return {
			x: newX,
			y: newY
		}
	}

	generateGuid() {
		return (Math.random() + 1).toString(36).substring(7)
	}

	persistFinalShapeDetails(id, type, attributes) {
		this.drawHandler.persistFinalShapeDetails(id, type, attributes)
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
		const canvas = this.drawHandler.getCanvas()
		if(this.#activeLine) canvas.removeSvgElement(this.#activeLine)
		for(const line of this.#activeLines) canvas.removeSvgElement(line)
	}
	
	cancelDrawingHandler() {
		this.deleteAllLines()
		this.resetFieldsForDrawingLines()
	}

	resetFieldsForDrawingLines() {
		this.#activeLine = null
		this.#activeLines = []
		this.#activeVertices = new Set()
	}

	handleMouseClick(mouseEvent) {
		const canvas = this.drawHandler.getCanvas()
		const {x, y} = this.getClosestGridPoint({x: mouseEvent.offsetX, y: mouseEvent.offsetY})

		if(this.#activeLine) {
			// end current line but keep track of it
			canvas.updateSvgAttributes(this.#activeLine, {
				x2: x,
				y2: y
			})
			this.#activeLines.push(this.#activeLine)
			this.#activeLine = null
			
			// check if the current line hasn't connected to a previous line
			const endingVertex = `${x} ${y}`
			if(!this.#activeVertices.has(endingVertex)) {
				// polygon hasn't been closed yet, keep track of the line's ending point
				this.#activeVertices.add(endingVertex)
			} else {
				// closed a shape! convert lines to a polygon and don't try to create another line
	
				this.deleteAllLines()
	
				// create polygon
				const id = this.generateGuid()
				const points = Array.from(this.#activeVertices).join(' ')
				const polygon = canvas.createSvgElement('polygon', {
					id,
					points,
					...this.constantAttributes
				})
				canvas.addSvgElement(polygon)
				
				// add click handler
				polygon.addEventListener('click', shapeClickHandler)
	
				this.persistFinalShapeDetails(id, 'polygon', {
					points,
					...this.constantAttributes
				})

				// stop processing (don't try to create the next line)
				 this.resetFieldsForDrawingLines()
				return
			}
		}
		
		// always create a new line to connect to the previous
		this.#activeLine = canvas.createSvgElement('line', {
			x1: x,
			y1: y,
			x2: x,
			y2: y,
			stroke: 'black'
		})
		canvas.addSvgElement(this.#activeLine)
		// keep track of the starting point
		this.#activeVertices.add(`${x} ${y}`)
	}

	handleMouseMove(mouseEvent) {
		const canvas = this.drawHandler.getCanvas()
		if(this.#activeLine) {
			canvas.updateSvgAttributes(this.#activeLine, {
				x2: mouseEvent.offsetX,
				y2: mouseEvent.offsetY
			})
		}
	}
}

class DrawCircleHandler extends DrawShapeHandler {
	#activeCircle = null

	getCircleCenterCoordinates() {
		const { cx: { baseVal: { value: cx } }, cy: { baseVal: { value: cy } } } = this.#activeCircle
		return { cx, cy }
	}

	getDistanceBetweenCircleAndMouseEvent(mouseEvent) {
		const { cx, cy } = this.getCircleCenterCoordinates()
		const { offsetX, offsetY } = mouseEvent

		let x = cx - offsetX
		let y = cy - offsetY
		return Math.sqrt(x * x + y * y)
	}

	cancelDrawingHandler() {
		if(this.#activeCircle) this.drawHandler.getCanvas().removeSvgElement(this.#activeCircle)
	}

	handleMouseClick(mouseEvent) {
		const canvas = this.drawHandler.getCanvas()
		if(this.#activeCircle) {
			// end sphere
			const { cx, cy } = this.getCircleCenterCoordinates()
			const distance = this.getDistanceBetweenCircleAndMouseEvent(mouseEvent) 
	
			canvas.updateSvgAttributes(this.#activeCircle, {
				r: distance
			})
	
			// add click handler
			this.#activeCircle.addEventListener('click', shapeClickHandler)
	
			const id = this.generateGuid()

			this.persistFinalShapeDetails(id, 'circle', {
				cx,
				cy,
				r: distance,
				...this.constantAttributes
			})

			this.#activeCircle = null
		} else {
			const {x, y} = this.getClosestGridPoint({x: mouseEvent.offsetX, y: mouseEvent.offsetY})
			this.#activeCircle = canvas.createSvgElement('circle', {
				cx: x,
				cy: y,
				r: 0,
				...this.constantAttributes
			})
			canvas.addSvgElement(this.#activeCircle)
		}
	}

	handleMouseMove(mouseEvent) {
		const canvas = this.drawHandler.getCanvas()
		if(this.#activeCircle) {
			canvas.updateSvgAttributes(this.#activeCircle, {
				r: this.getDistanceBetweenCircleAndMouseEvent(mouseEvent)
			})
		}
	}
}
