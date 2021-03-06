/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import waitUntil from 'wait-until-promise';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { CKEditorComponent } from './ckeditor.component';
import {
	fireDragEvent,
	mockDropEvent,
	mockPasteEvent,
	setDataMultipleTimes,
	whenDataReady,
	whenEvent
} from '../test.tools';
import { CKEditor4 } from './ckeditor';
import EditorType = CKEditor4.EditorType;

declare var CKEDITOR: any;

describe( 'CKEditorComponent', () => {
	let component: CKEditorComponent,
		fixture: ComponentFixture<CKEditorComponent>,
		config: Object;

	beforeEach( async( () => {
		TestBed.configureTestingModule( {
			declarations: [ CKEditorComponent ]
		} ).compileComponents();
	} ) );

	beforeEach( () => {
		fixture = TestBed.createComponent( CKEditorComponent );
		component = fixture.componentInstance;
		component.config = config;

		fixture.detectChanges();
	} );

	afterEach( () => {
		config = {};
		fixture.destroy();
	} );

	[
		EditorType.DIVAREA,
		EditorType.INLINE,
		EditorType.CLASSIC
	].forEach( editorType => {
		describe( `type="${editorType}"`, () => {
			beforeEach( () => {
				component.type = editorType;
			} );

			describe( 'on initialization', () => {
				const method = editorType === 'inline' ? 'inline' : 'replace';

				it( `should create editor with CKEDITOR.${method}`, () => {
					fixture.detectChanges();

					return whenEvent( 'ready', component ).then( () => {
						expect( component.instance.elementMode ).toEqual( editorType == 'inline' ? 3 : 1 );
					} );
				} );

				it( 'should have editorUrl pointing to the latest CKEditor 4 version', () => {
					fixture.detectChanges();

					return whenEvent( 'ready', component ).then( () => {
						expect( component.editorUrl ).toEqual( 'https://cdn.ckeditor.com/4.14.1/standard-all/ckeditor.js' );
					} );
				} );

				it( 'should have proper editor type', () => {
					whenEvent( 'ready', component ).then( () => {
						fixture.detectChanges();
						expect( component.instance.editable().isInline() ).toBe( component.type !== EditorType.CLASSIC );
					} );
				} );

				it( 'should emit ready event', () => {
					const spy = jasmine.createSpy();
					component.ready.subscribe( spy );

					fixture.detectChanges();

					return whenEvent( 'ready', component ).then( () => {
						expect( spy ).toHaveBeenCalledTimes( 1 );
					} );
				} );

				describe( 'with tagName unset', () => {
					it( 'editor should be initialized using textarea element', () => {
						fixture.detectChanges();

						return whenEvent( 'ready', component ).then( () => {
							expect( fixture.nativeElement.firstElementChild.tagName ).toEqual( 'TEXTAREA' );
						} );
					} );
				} );

				describe( 'with tagName set to div', () => {
					beforeEach( () => {
						component.tagName = 'div';
					} );

					it( 'editor should be initialized using div element', () => {
						fixture.detectChanges();

						return whenEvent( 'ready', component ).then( () => {
							// IE browsers use SPAN elements instead of DIV as a main CKEditor wrapper
							// when replace() method for creation is used.
							const expectedElement = CKEDITOR.env.ie && method !== 'inline' ? 'SPAN' : 'DIV';
							expect( fixture.nativeElement.lastChild.tagName ).toEqual( expectedElement );
						} );
					} );
				} );

				const isDivarea = editorType === EditorType.DIVAREA;

				[ {
					newConfig: undefined,
					msg: 'without config',
					warn: false
				}, {
					newConfig: { extraPlugins: 'basicstyles,divarea,link' },
					msg: 'config.extraPlugins defined as a string',
					warn: false
				}, {
					newConfig: { extraPlugins: [ 'basicstyles', 'divarea', 'link' ] },
					msg: 'config.extraPlugins defined as an array',
					warn: false
				}, {
					newConfig: { removePlugins: 'basicstyles,divarea,link,divarea' },
					msg: 'config.removePlugins defined as a string',
					warn: isDivarea
				}, {
					newConfig: { removePlugins: [ 'basicstyles', 'divarea', 'link', 'divarea' ] },
					msg: 'config.removePlugins defined as an array',
					warn: isDivarea
				} ].forEach( ( { newConfig, msg, warn } ) => {
					describe( msg, () => {
						beforeAll( () => {
							config = newConfig;
						} );

						it( `console ${warn ? 'should' : 'shouldn\'t'} warn`, () => {
							const spy = spyOn( console, 'warn' );

							fixture.detectChanges();

							return whenEvent( 'ready', component ).then( () => {
								warn
									? expect( spy ).toHaveBeenCalled()
									: expect( spy ).not.toHaveBeenCalled();
							} );
						} );

						it( `editor ${ isDivarea ? 'should' : 'shouldn\'t' } use divarea plugin`, () => {
							fixture.detectChanges();

							return whenEvent( 'ready', component ).then( ( { editor } ) => {
								isDivarea
									? expect( editor.plugins.divarea ).not.toBeUndefined()
									: expect( editor.plugins.divarea ).toBeUndefined();
							} );
						} );
					} );
				} );

				describe( 'when set with config', () => {
					beforeEach( done => {
						component.config = {
							readOnly: true,
							width: 1000,
							height: 1000
						};
						fixture.detectChanges();
						whenEvent( 'ready', component ).then( done );
					} );

					it( 'editor should be readOnly', () => {
						expect( component.instance.readOnly ).toBeTruthy();
					} );

					it( 'editor should have width and height', () => {
						expect( component.instance.config.width ).toBe( 1000 );
						expect( component.instance.config.height ).toBe( 1000 );
					} );

					it( 'editor should have undo plugin', () => {
						expect( component.instance.plugins.undo ).not.toBeUndefined();
					} );

					it( 'should register changes', async done => {
						const spy = jasmine.createSpy();

						component.registerOnChange( spy );

						setDataMultipleTimes( component.instance, [
							'<p>Hello World!</p>',
							'<p>I am CKEditor for Angular!</p>'
						] ).then( () => {
							expect( spy ).toHaveBeenCalledTimes( 2 );

							done();
						} );
					} );
				} );

				describe( 'when set without undo plugin', () => {
					beforeEach( ( done ) => {
						component.config = {
							removePlugins: 'undo'
						};
						fixture.detectChanges();
						whenEvent( 'ready', component ).then( done );
					} );

					it( 'editor should not have undo plugin', () => {
						expect( component.instance.plugins.undo ).toBeUndefined();
					} );

					it( 'should register changes without undo plugin', async done => {
						const spy = jasmine.createSpy();

						component.registerOnChange( spy );

						setDataMultipleTimes( component.instance, [
							'<p>Hello World!</p>',
							'<p>I am CKEditor for Angular!</p>'
						] ).then( () => {
							expect( spy ).toHaveBeenCalledTimes( 2 );

							done();
						} );
					} );
				} );
			} );

			describe( 'on destroy', () => {
				it ( 'should not have call runOutsideAngular when destroy before DOM loaded', done => {
					spyOn( fixture.ngZone, 'runOutsideAngular' );

					fixture.detectChanges();

					waitUntil( () => {
						fixture.destroy();
						return true;
					}, 0 ).then( () => {
						expect( fixture.ngZone.runOutsideAngular ).toHaveBeenCalledTimes( 1 );
					} ).then( done );
				} );

				it ( 'should not have call runOutsideAngular when destroy before DOM loaded', done => {
					spyOn( fixture.ngZone, 'runOutsideAngular' );

					fixture.detectChanges();

					waitUntil( () => {
						fixture.destroy();
						return true;
					}, 200 ).then( () => {
						expect( fixture.ngZone.runOutsideAngular ).toHaveBeenCalledTimes( 1 );
					} ).then( done );
				} );
			} );

			describe( 'when component is ready', () => {
				beforeEach( done => {
					fixture.detectChanges();
					whenEvent( 'ready', component ).then( done );
				} );

				it( 'should be initialized', () => {
					expect( component ).toBeTruthy();
				} );

				it( `editor ${editorType === 'inline' ? 'should' : 'shouldn\'t'} be inline`, () => {
					const expectation = expect( component.instance.editable().hasClass( 'cke_editable_inline' ) );

					editorType === 'inline'
						? expectation.toBeTruthy()
						: expectation.toBeFalsy();
				} );

				it( 'editor shouldn\'t be read-only', () => {
					fixture.detectChanges();

					expect( component.readOnly ).toBeFalsy();
					expect( component.instance.readOnly ).toBeFalsy();
				} );

				describe( 'with changed read-only mode', () => {
					it( 'should allow to enable read-only mode', () => {
						component.readOnly = true;

						expect( component.readOnly ).toBeTruthy();
						expect( component.instance.readOnly ).toBeTruthy();
					} );

					it( 'should allow to disable read-only mode', () => {
						component.readOnly = false;

						expect( component.readOnly ).toBeFalsy();
						expect( component.instance.readOnly ).toBeFalsy();
					} );
				} );

				it( 'initial data should be empty', () => {
					fixture.detectChanges();

					expect( component.data ).toEqual( null );
					expect( component.instance.getData() ).toEqual( '' );
				} );

				describe( 'component data', () => {
					const data = '<b>foo</b>',
						expected = '<p><strong>foo</strong></p>\n';

					it( 'should be configurable at the start of the component', async done => {
						fixture.detectChanges();

						await whenDataReady( component.instance, () => component.data = data );

						expect( component.data ).toEqual( expected );
						expect( component.instance.getData() ).toEqual( expected );

						done();
					} );

					it( 'should be writeable by ControlValueAccessor', async done => {
						fixture.detectChanges();

						const editor = component.instance;

						await whenDataReady( editor, () => component.writeValue( data ) );

						expect( component.instance.getData() ).toEqual( expected );

						await whenDataReady( editor, () => component.writeValue( '<p><i>baz</i></p>' ) );

						expect( component.instance.getData() ).toEqual( '<p><em>baz</em></p>\n' );

						done();
					} );
				} );

				describe( 'editor event', () => {
					it( 'change should emit component change', () => {
						fixture.detectChanges();

						const spy = jasmine.createSpy();
						component.change.subscribe( spy );

						component.instance.fire( 'change' );

						expect( spy ).toHaveBeenCalledTimes( 1 );
					} );

					it( 'focus should emit component focus', () => {
						fixture.detectChanges();

						const spy = jasmine.createSpy();
						component.focus.subscribe( spy );

						component.instance.fire( 'focus' );

						expect( spy ).toHaveBeenCalledTimes( 1 );
					} );

					it( 'blur should emit component blur', () => {
						fixture.detectChanges();

						const spy = jasmine.createSpy();
						component.blur.subscribe( spy );

						component.instance.fire( 'blur' );

						expect( spy ).toHaveBeenCalledTimes( 1 );
					} );

					it( 'paste should emit component paste', () => {
						fixture.detectChanges();

						const spy = jasmine.createSpy();
						component.paste.subscribe( spy );

						const editable = component.instance.editable();
						const editor = editable.getEditor( false );

						const eventPromise =  whenEvent( 'paste', component ).then( () => {
							expect( spy ).toHaveBeenCalledTimes( 1 );
							expect( component.instance.getData() ).toEqual( '<p>bam</p>\n' );
						} );

						editor.fire( 'paste', {
							dataValue: '<p>bam</p>'
						} );

						return eventPromise;
					} );

					it( 'afterPaste should emit component afterPaste', () => {
						fixture.detectChanges();

						const spy = jasmine.createSpy();
						component.afterPaste.subscribe( spy );

						const editable = component.instance.editable();
						const editor = editable.getEditor( false );

						const eventPromise = whenEvent( 'afterPaste', component ).then( () => {
							expect( spy ).toHaveBeenCalledTimes( 1 );
							expect( component.instance.getData() ).toEqual( '<p>bam</p>\n' );
						} );

						editor.fire( 'paste', {
							dataValue: '<p>bam</p>'
						} );

						return eventPromise;
					} );

					it( 'drag/drop events should emit component dragStart, dragEnd and drop', async done => {
						fixture.detectChanges();

						const spyDragStart = jasmine.createSpy( 'dragstart' );
						component.dragStart.subscribe( spyDragStart );

						const spyDragEnd = jasmine.createSpy( 'dragend' );
						component.dragEnd.subscribe( spyDragEnd );

						const spyDrop = jasmine.createSpy( 'drop' );
						component.drop.subscribe( spyDrop );

						whenDataReady( component.instance, () => {
							const dropEvent = mockDropEvent();
							const paragraph = component.instance.editable().findOne( 'p' );

							component.instance.getSelection().selectElement( paragraph );

							fireDragEvent( 'dragstart', component.instance, dropEvent );

							expect( spyDragStart ).toHaveBeenCalledTimes( 1 );

							fireDragEvent( 'dragend', component.instance, dropEvent );

							expect( spyDragEnd ).toHaveBeenCalledTimes( 1 );

							// There is some issue in Firefox with simulating drag-drop flow. The drop event
							// is not fired making this assertion fail. Let's skip it for now.
							if ( !CKEDITOR.env.gecko ) {
								fireDragEvent( 'drop', component.instance, dropEvent );

								expect( spyDrop ).toHaveBeenCalledTimes( 1 );
							}

							done();
						} );
					} );

					it( 'fileUploadRequest should emit component fileUploadRequest', () => {
						fixture.detectChanges();

						const spy = jasmine.createSpy();
						component.fileUploadRequest.subscribe( spy );

						const fileLoaderMock = {
							fileLoader: {
								file: Blob ? new Blob() : '',
								fileName: 'fileName',
								xhr: {
									open: function() {},
									send: function() {}
								}
							},
							requestData: {}
						};

						component.instance.fire( 'fileUploadRequest', fileLoaderMock );

						expect( spy ).toHaveBeenCalledTimes( 1 );
					} );

					it( 'fileUploadResponse should emit component fileUploadResponse', () => {
						fixture.detectChanges();

						const spy = jasmine.createSpy();
						component.fileUploadResponse.subscribe( spy );

						const data = {
							fileLoader: {
								xhr: { responseText: 'Not a JSON.' },
								lang: {
									filetools: { responseError: 'Error' }
								}
							}
						};

						component.instance.fire( 'fileUploadResponse', data );

						expect( spy ).toHaveBeenCalledTimes( 1 );
					} );
				} );

				describe( 'when control value accessor callbacks are set', () => {
					it( 'onTouched callback should be called when editor is blurred', () => {
						fixture.detectChanges();

						const spy = jasmine.createSpy();
						component.registerOnTouched( spy );

						component.instance.fire( 'blur' );

						expect( spy ).toHaveBeenCalled();
					} );

					it( 'onChange callback should be called when editor model changes', async done => {
						fixture.detectChanges();

						const spy = jasmine.createSpy();
						component.registerOnChange( spy );

						setDataMultipleTimes( component.instance, [
							'initial', 'initial', 'modified'
						] ).then( () => {
							expect( spy ).toHaveBeenCalledTimes( 2 );
							done();
						} );
					} );
				} );
			} );
		} );
	} );
} );
