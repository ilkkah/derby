/*
 * components.js
 *
 * Components associate custom script functionality with a view. They can be
 * distributed as standalone modules containing templates, scripts, and styles.
 * They can also be used to modularize application functionality.
 *
 */

var EventEmitter = require('events').EventEmitter;
var util = require('racer').util;
var App = require('./App');

exports.Component = Component;
exports.ComponentFactory = ComponentFactory;

function Component(id, model, parent) {
  EventEmitter.call(this);
  this.id = id;
  this.model = model;
  this.parent = parent;
}

util.mergeInto(Component.prototype, EventEmitter.prototype);

function ComponentFactory(constructor) {
  this.constructor = constructor;
}

ComponentFactory.prototype.create = function(context) {
  var parent = context.controller;
  var id = context.id();
  var model = parent.model.scope('$components.' + id);
  model.set('id', id);
  // Store a reference to the component's scope such that the expression
  // getters are relative to the component
  model.data = model.get();

  // Create the component instance. The component constructor should be an
  // empty function and the actual initialization code should be done in the
  // component's init method. This means that we don't have to rely on users
  // properly calling the Component constructor method and avoids having to
  // play nice with how CoffeeScript extends class constructors
  var component = new this.constructor();
  Component.call(component, id, model, parent);
  if (component.init) component.init(model);

  // Kick off hooks if view pointer specified `on` or `as` attributes
  if (context.hooks) {
    for (var i = 0, len = context.hooks.length; i < len; i++) {
      context.hooks[i].emit(context, component);
    }
  }

  return context.componentChild(component);
}

App.prototype.component = function(viewName, constructor) {
  if (typeof viewName === 'function') {
    constructor = viewName;
    viewName = null;
  }

  // Inherit from Component
  extendComponent(constructor);

  // Associate the appropriate view with the component type
  var view = findOrLoadView(this, viewName, constructor);
  view.componentFactory = new ComponentFactory(constructor);

  // Make chainable
  return this;
}

function findOrLoadView(app, viewName, constructor) {
  var view;
  if (viewName) {
    view = app.views.find(viewName);
  } else if (constructor.prototype.view) {
    // files.loadViews(app.views, filename, 'app', cb);
    // ...
    // this.views.register()
  }
  if (!view) {
    throw new Error('app.component() cannot find view: ' + viewName);
  }
  return view;
}

function extendComponent(constructor) {
  // Don't do anything if the constructor already extends Component
  if (constructor.prototype instanceof Component) return;
  // Otherwise, replace its prototype with an instance of Component
  var oldPrototype = constructor.prototype;
  constructor.prototype = new Component();
  util.mergeInto(constructor.prototype, oldPrototype);
}