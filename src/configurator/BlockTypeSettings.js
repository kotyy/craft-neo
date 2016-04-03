import $ from 'jquery'

import Garnish from 'garnish'
import Craft from 'craft'

import NS from '../namespace'

import Settings from './Settings'

import renderTemplate from './templates/blocktype_settings.twig'
import renderCheckbox from './templates/blocktype_settings_checkbox.twig'
import '../twig-extensions'

const _defaults = {
	namespace: [],
	id: null,
	sortOrder: 0,
	name: '',
	handle: '',
	maxBlocks: 0,
	childBlocks: null,
	childBlockTypes: [],
	errors: {}
}

export default Settings.extend({

	_templateNs: [],
	_childBlockTypes: [],

	$sortOrderInput: new $,
	$nameInput: new $,
	$handleInput: new $,
	$maxBlocksInput: new $,

	init(settings = {})
	{
		settings = Object.assign({}, _defaults, settings)

		this._templateNs = NS.parse(settings.namespace)
		this._childBlockTypes = []
		this._id = settings.id
		this._errors = settings.errors

		this.setSortOrder(settings.sortOrder)
		this.setName(settings.name)
		this.setHandle(settings.handle)
		this.setMaxBlocks(settings.maxBlocks)

		NS.enter(this._templateNs)

		this.$container = $(renderTemplate({
			id:        this.getId(),
			sortOrder: this.getSortOrder(),
			name:      this.getName(),
			handle:    this.getHandle(),
			maxBlocks: this.getMaxBlocks(),
			errors:    this.getErrors()
		}))

		NS.leave()

		const $neo = this.$container.find('[data-neo-bts]')
		this.$sortOrderInput = $neo.filter('[data-neo-bts="input.sortOrder"]')
		this.$nameInput = $neo.filter('[data-neo-bts="input.name"]')
		this.$handleInput = $neo.filter('[data-neo-bts="input.handle"]')
		this.$maxBlocksInput = $neo.filter('[data-neo-bts="input.maxBlocks"]')
		this.$childBlocksInput = $neo.filter('[data-neo-bts="input.childBlocks"]')
		this.$childBlocksContainer = $neo.filter('[data-neo-bts="container.childBlocks"]')
		this.$deleteButton = $neo.filter('[data-neo-bts="button.delete"]')

		this.$childBlocksInput.checkboxselect()

		this._childBlocksSelect = this.$childBlocksInput.data('checkboxSelect')
		this._handleGenerator = new Craft.HandleGenerator(this.$nameInput, this.$handleInput)

		for(let blockType of settings.childBlockTypes)
		{
			this.addChildBlockType(blockType)
		}

		this.addListener(this.$nameInput, 'keyup change', () => this.setName(this.$nameInput.val()))
		this.addListener(this.$handleInput, 'keyup change', () => this.setHandle(this.$handleInput.val()))
		this.addListener(this.$maxBlocksInput, 'keyup change', () => this.setMaxBlocks(this.$maxBlocksInput.val()))
		this.addListener(this.$deleteButton, 'click', () => this.destroy())
	},

	getFocusInput()
	{
		return this.$nameInput
	},

	getId()
	{
		return this._id
	},

	isNew()
	{
		return /^new/.test(this.getId())
	},

	getErrors()
	{
		return this._errors
	},

	setSortOrder(sortOrder)
	{
		this.base(sortOrder)

		this.$sortOrderInput.val(this.getSortOrder())
	},

	getName() { return this._name },
	setName(name)
	{
		const oldName = this._name
		this._name = name

		this.$nameInput.val(this._name)

		this.trigger('change', {
			property: 'name',
			oldValue: oldName,
			newValue: this._name
		})
	},

	getHandle() { return this._handle },
	setHandle(handle)
	{
		const oldHandle = this._handle
		this._handle = handle

		this.$handleInput.val(this._handle)

		this.trigger('change', {
			property: 'handle',
			oldValue: oldHandle,
			newValue: this._handle
		})
	},

	getMaxBlocks() { return this._maxBlocks },
	setMaxBlocks(maxBlocks)
	{
		const oldMaxBlocks = this._maxBlocks
		this._maxBlocks = Math.max(0, maxBlocks|0)

		this.$maxBlocksInput.val(this._maxBlocks > 0 ? this._maxBlocks : null)

		this.trigger('change', {
			property: 'maxBlocks',
			oldValue: oldMaxBlocks,
			newValue: this._maxBlocks
		})
	},

	getChildBlocks() { return this._childBlocks },
	setChildBlocks(childBlocks)
	{
		if(childBlocks === true)
		{
			// Tick all
		}
		else
		{

		}
	},

	addChildBlockType(blockType, index = -1)
	{
		if(!this._childBlockTypes.includes(blockType))
		{
			NS.enter(this._templateNs)

			const settings = blockType.getSettings()
			const $checkbox = $(renderCheckbox({
				id: 'childBlock-' + settings.getId(),
				name: '',
				value: settings.getId(),
				label: settings.getName()
			}))

			NS.leave()

			if(index < 0 || index >= this._childBlockTypes.length)
			{
				this._childBlockTypes.push(blockType)
				this.$childBlocksContainer.append($checkbox)
			}
			else
			{
				this._childBlockTypes.splice(index, 0, blockType)
				$checkbox.insertAt(index, this.$childBlocksContainer)
			}

			const select = this._childBlocksSelect
			const allChecked = select.$all.prop('checked')
			select.$options = select.$options.add($checkbox.find('input'))
			if(allChecked) select.onAllChange()

			const eventNs = '.childBlock' + this.getId()
			settings.on('change' + eventNs, e => this['@onChildBlockTypeChange'](e, blockType, $checkbox))
			settings.on('destroy' + eventNs, e => this.removeChildBlockType(blockType))
		}
	},

	removeChildBlockType(blockType)
	{
		const index = this._childBlockTypes.indexOf(blockType)
		if(index >= 0)
		{
			this._childBlockTypes.splice(index, 1)

			const settings = blockType.getSettings()
			const $checkbox = this.$childBlocksContainer.children().eq(index)

			$checkbox.remove()

			const select = this._childBlocksSelect
			select.$options = select.$options.remove($checkbox.find('input'))

			const eventNs = '.childBlock' + this.getId()
			settings.off(eventNs)
		}
	},

	'@onChildBlockTypeChange'(e, blockType, $checkbox)
	{
		const settings = blockType.getSettings()

		const $neo = $checkbox.find('[data-neo-btsc]')
		const $labelText = $neo.filter('[data-neo-btsc="text.label"]')

		switch(e.property)
		{
			case 'name':
				$labelText.text(e.newValue)
				break

			case 'sortOrder':
				const oldIndex = this._childBlockTypes.indexOf(blockType)
				const newIndex = settings.getSortOrder() - 1

				this._childBlockTypes.splice(oldIndex, 1)
				this._childBlockTypes.splice(newIndex, 0, blockType)

				$checkbox.insertAt(newIndex, this.$childBlocksContainer)

				break
		}
	}
},
{
	_totalNewBlockTypes: 0,

	getNewId()
	{
		return `new${this._totalNewBlockTypes++}`
	}
})
