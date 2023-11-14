'use babel'

import { CompositeDisposable } from 'atom'

export default {

  config: {
    wheelDiv: {
      order: 1,
      title: 'Scroll divider',
      type: 'integer',
      default: 7,
      minimum: 1,
      maximum: 30,
    },
    lineCount: {
      order: 2,
      title: 'Line count keyboard scroll',
      type: 'integer',
      default: 20,
      minimum: 1,
    },
    pageSpeedFactor: {
      order: 3,
      title: 'Speed factor of page scroll commands',
      type: 'integer',
      default: 3,
      minimum: 1,
      maximum: 20,
    },
    lineSpeedFactor: {
      order: 4,
      title: 'Speed factor of line scroll commands',
      type: 'integer',
      default: 3,
      minimum: 1,
      maximum: 20,
    },
  },


  activate () {
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.workspace.observeTextEditors((editor) => { this.patchEditor(editor) }),
      atom.config.observe('smooth-scroll.wheelDiv', (value) => {
        this.wheelDiv = value
      }),
      atom.config.observe('smooth-scroll.lineCount', (value) => {
        this.lineCount = value
      }),
      atom.config.observe('smooth-scroll.pageSpeedFactor', (value) => {
        this.pageSpeedFactor = value
      }),
      atom.config.observe('smooth-scroll.lineSpeedFactor', (value) => {
        this.lineSpeedFactor = value
      }),
      atom.commands.add('atom-text-editor', {
        'smooth-scroll:line-up':
          () => this.scrollUpByCountOfLines(),
        'smooth-scroll:line-down':
          () => this.scrollDownByCountOfLines(),
        'smooth-scroll:line-left':
          () => this.scrollLeftByCountOfLines(),
        'smooth-scroll:line-right':
          () => this.scrollRightByCountOfLines(),
        'smooth-scroll:page-up':
          () => this.scrollPageUp(),
        'smooth-scroll:page-down':
          () => this.scrollPageDown(),
      })
    )
  },

  deactivate () {
    for (let editor of atom.workspace.getTextEditors()) {
      editor.element.removeEventListener('wheel', editor.element.wheelListener, { capture:true, passive:true } )
    }
    this.disposables.dispose()
  },

  patchEditor(editor) {
    let component = editor.component
    let element = editor.element
    let isScrolling = false
    let animationFrameId = false

    editor.pendingScrollX = 0
    editor.pendingScrollY = 0

    editor.scrollAnimation = (valueX=0, valueY=0, scrollStep=0, resetValues=false) => {
      if (resetValues) {
        editor.pendingScrollX  = valueX
        editor.pendingScrollY  = valueY
      } else {
        editor.pendingScrollX += valueX
        editor.pendingScrollY += valueY
      }
      editor.scrollStep = scrollStep
      if (isScrolling) { return }
      editor._scrollAnimation()
    }

    editor._scrollAnimation = () => {
      let isChangedX, isChangedY
      isScrolling = true

      let stepX = this.parseStep(editor.pendingScrollX, editor.scrollStep)
      if (stepX) {
        editor.pendingScrollX -= stepX
        isChangedX = component.setScrollLeft(component.scrollLeft+stepX)
      }

      let stepY = this.parseStep(editor.pendingScrollY, editor.scrollStep)
      if (stepY) {
        editor.pendingScrollY -= stepY
        isChangedY = component.setScrollTop(component.scrollTop+stepY)
      }

      if (isChangedX || isChangedY) {
        component.updateSync()
      } else {
        editor.pendingScrollX = 0
        editor.pendingScrollY = 0
      }

      if (editor.pendingScrollX || editor.pendingScrollY) {
        animationFrameId = requestAnimationFrame(editor._scrollAnimation)
      } else {
        if (animationFrameId) { cancelAnimationFrame(animationFrameId) }
        isScrolling = false
      }
    }

    element.wheelListener = (e) => {
      let scrollSensitivity = editor.getScrollSensitivity()/100
      if (e.shiftKey) {
        editor.scrollAnimation(-e.wheelDeltaY*scrollSensitivity, 0, 0, false)
      } else {
        editor.scrollAnimation(0, -e.wheelDeltaY*scrollSensitivity, 0, false)
      }
    }

    element.addEventListener('wheel', element.wheelListener, { capture:true, passive:true } )
  },

  parseStep(value, scrollStep) {
    if (!value) { return 0}
    scrollStep = Math.abs(scrollStep)
    if (scrollStep>0) {
      if (Math.abs(value)<scrollStep) {
        return value
      } else {
        return Math.sign(value)*scrollStep
      }
    } else {
      if (Math.abs(value)<this.wheelDiv) {
        return Math.max(Math.sign(value), parseInt(value/3, 10))
      } else {
        return parseInt(value/this.wheelDiv, 10)
      }
    }
  },

  scrollPageUp() {
    let editor = atom.workspace.getActiveTextEditor()
    let offset = -editor.element.offsetHeight
    editor.scrollAnimation(0, offset, parseInt(offset/100*this.pageSpeedFactor, 10), true)
  },

  scrollPageDown() {
    let editor = atom.workspace.getActiveTextEditor()
    let offset = +editor.element.offsetHeight
    editor.scrollAnimation(0, offset, parseInt(offset/100*this.pageSpeedFactor, 10), true)
  },

  scrollUpByCountOfLines() {
    let editor = atom.workspace.getActiveTextEditor()
    let offset = -editor.lineHeightInPixels*this.lineCount
    editor.scrollAnimation(0, offset, parseInt(offset/100*this.lineSpeedFactor, 10), true)
  },

  scrollDownByCountOfLines() {
    let editor = atom.workspace.getActiveTextEditor()
    let offset = +editor.lineHeightInPixels*this.lineCount
    editor.scrollAnimation(0, offset, parseInt(offset/100*this.lineSpeedFactor, 10), true)
  },

  scrollLeftByCountOfLines() {
    let editor = atom.workspace.getActiveTextEditor()
    let offset = -editor.lineHeightInPixels*this.lineCount
    editor.scrollAnimation(offset, 0, parseInt(offset/100*this.lineSpeedFactor, 10), true)
  },

  scrollRightByCountOfLines() {
    let editor = atom.workspace.getActiveTextEditor()
    let offset = +editor.lineHeightInPixels*this.lineCount
    editor.scrollAnimation(offset, 0, parseInt(offset/100*this.lineSpeedFactor, 10), true)
  },
}