import { relations } from "drizzle-orm/relations";
import { category, product, store, user, tenant, ticket, ticketItem, kitchenItem, ingredient, recipeItem, stockMovement, shift, attendance, session, deliveryOrders, deliveryTracking, modifierGroups, modifierOptions, combos, comboSlots, products, comboSlotItems, comboItems, mealMenus, mealMenuSchedules, mealMenuCourses, productPriceRules, mealMenuCourseItems, gestoriaDocuments, gestoriaDocumentLines, supplierCatalog, supplierPriceHistory, recipes, modifierRecipeIngredients, modifierRecipes, productionIngredients, productions, recipeIngredients, suppliers, tables, buffetSessions, albaranes, productBatches, purchaseOrders, purchaseOrderLines, buffetRounds, buffetWaste, albaranLines, productModifiers, productStock } from "./schema";

export const productRelations = relations(product, ({one, many}) => ({
	category: one(category, {
		fields: [product.categoryId],
		references: [category.id]
	}),
	ticketItems: many(ticketItem),
	recipeItems: many(recipeItem),
}));

export const categoryRelations = relations(category, ({many}) => ({
	products: many(product),
}));

export const userRelations = relations(user, ({one, many}) => ({
	store: one(store, {
		fields: [user.storeId],
		references: [store.id]
	}),
	tenant: one(tenant, {
		fields: [user.tenantId],
		references: [tenant.id]
	}),
	tickets: many(ticket),
	shifts: many(shift),
	attendances: many(attendance),
	sessions: many(session),
}));

export const storeRelations = relations(store, ({one, many}) => ({
	users: many(user),
	tenant: one(tenant, {
		fields: [store.tenantId],
		references: [tenant.id]
	}),
	tickets: many(ticket),
	shifts: many(shift),
}));

export const tenantRelations = relations(tenant, ({many}) => ({
	users: many(user),
	stores: many(store),
}));

export const ticketRelations = relations(ticket, ({one, many}) => ({
	user: one(user, {
		fields: [ticket.createdById],
		references: [user.id]
	}),
	store: one(store, {
		fields: [ticket.storeId],
		references: [store.id]
	}),
	ticketItems: many(ticketItem),
}));

export const ticketItemRelations = relations(ticketItem, ({one, many}) => ({
	product: one(product, {
		fields: [ticketItem.productId],
		references: [product.id]
	}),
	ticket: one(ticket, {
		fields: [ticketItem.ticketId],
		references: [ticket.id]
	}),
	kitchenItems: many(kitchenItem),
}));

export const kitchenItemRelations = relations(kitchenItem, ({one}) => ({
	ticketItem: one(ticketItem, {
		fields: [kitchenItem.ticketItemId],
		references: [ticketItem.id]
	}),
}));

export const recipeItemRelations = relations(recipeItem, ({one}) => ({
	ingredient: one(ingredient, {
		fields: [recipeItem.ingredientId],
		references: [ingredient.id]
	}),
	product: one(product, {
		fields: [recipeItem.productId],
		references: [product.id]
	}),
}));

export const ingredientRelations = relations(ingredient, ({many}) => ({
	recipeItems: many(recipeItem),
	stockMovements: many(stockMovement),
}));

export const stockMovementRelations = relations(stockMovement, ({one}) => ({
	ingredient: one(ingredient, {
		fields: [stockMovement.ingredientId],
		references: [ingredient.id]
	}),
}));

export const shiftRelations = relations(shift, ({one}) => ({
	store: one(store, {
		fields: [shift.storeId],
		references: [store.id]
	}),
	user: one(user, {
		fields: [shift.userId],
		references: [user.id]
	}),
}));

export const attendanceRelations = relations(attendance, ({one}) => ({
	user: one(user, {
		fields: [attendance.userId],
		references: [user.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const deliveryTrackingRelations = relations(deliveryTracking, ({one}) => ({
	deliveryOrder: one(deliveryOrders, {
		fields: [deliveryTracking.deliveryId],
		references: [deliveryOrders.id]
	}),
}));

export const deliveryOrdersRelations = relations(deliveryOrders, ({many}) => ({
	deliveryTrackings: many(deliveryTracking),
}));

export const modifierOptionsRelations = relations(modifierOptions, ({one}) => ({
	modifierGroup: one(modifierGroups, {
		fields: [modifierOptions.groupId],
		references: [modifierGroups.id]
	}),
}));

export const modifierGroupsRelations = relations(modifierGroups, ({many}) => ({
	modifierOptions: many(modifierOptions),
	productModifiers: many(productModifiers),
}));

export const comboSlotsRelations = relations(comboSlots, ({one, many}) => ({
	combo: one(combos, {
		fields: [comboSlots.comboId],
		references: [combos.id]
	}),
	comboSlotItems: many(comboSlotItems),
}));

export const combosRelations = relations(combos, ({many}) => ({
	comboSlots: many(comboSlots),
	comboItems: many(comboItems),
}));

export const comboSlotItemsRelations = relations(comboSlotItems, ({one}) => ({
	product: one(products, {
		fields: [comboSlotItems.productId],
		references: [products.id]
	}),
	comboSlot: one(comboSlots, {
		fields: [comboSlotItems.slotId],
		references: [comboSlots.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	comboSlotItems: many(comboSlotItems),
	comboItems: many(comboItems),
	productPriceRules: many(productPriceRules),
	mealMenuCourseItems: many(mealMenuCourseItems),
	recipes: many(recipes),
	modifierRecipeIngredients: many(modifierRecipeIngredients),
	productionIngredients: many(productionIngredients),
	recipeIngredients: many(recipeIngredients),
	supplierCatalogs: many(supplierCatalog),
	productions: many(productions),
	productBatches: many(productBatches),
	productStocks: many(productStock),
}));

export const comboItemsRelations = relations(comboItems, ({one}) => ({
	combo: one(combos, {
		fields: [comboItems.comboId],
		references: [combos.id]
	}),
	product: one(products, {
		fields: [comboItems.productId],
		references: [products.id]
	}),
}));

export const mealMenuSchedulesRelations = relations(mealMenuSchedules, ({one}) => ({
	mealMenu: one(mealMenus, {
		fields: [mealMenuSchedules.menuId],
		references: [mealMenus.id]
	}),
}));

export const mealMenusRelations = relations(mealMenus, ({many}) => ({
	mealMenuSchedules: many(mealMenuSchedules),
	mealMenuCourses: many(mealMenuCourses),
}));

export const mealMenuCoursesRelations = relations(mealMenuCourses, ({one, many}) => ({
	mealMenu: one(mealMenus, {
		fields: [mealMenuCourses.menuId],
		references: [mealMenus.id]
	}),
	mealMenuCourseItems: many(mealMenuCourseItems),
}));

export const productPriceRulesRelations = relations(productPriceRules, ({one}) => ({
	product: one(products, {
		fields: [productPriceRules.productId],
		references: [products.id]
	}),
}));

export const mealMenuCourseItemsRelations = relations(mealMenuCourseItems, ({one}) => ({
	mealMenuCourse: one(mealMenuCourses, {
		fields: [mealMenuCourseItems.courseId],
		references: [mealMenuCourses.id]
	}),
	product: one(products, {
		fields: [mealMenuCourseItems.productId],
		references: [products.id]
	}),
}));

export const gestoriaDocumentLinesRelations = relations(gestoriaDocumentLines, ({one}) => ({
	gestoriaDocument: one(gestoriaDocuments, {
		fields: [gestoriaDocumentLines.documentId],
		references: [gestoriaDocuments.id]
	}),
}));

export const gestoriaDocumentsRelations = relations(gestoriaDocuments, ({many}) => ({
	gestoriaDocumentLines: many(gestoriaDocumentLines),
}));

export const supplierPriceHistoryRelations = relations(supplierPriceHistory, ({one}) => ({
	supplierCatalog: one(supplierCatalog, {
		fields: [supplierPriceHistory.catalogId],
		references: [supplierCatalog.id]
	}),
}));

export const supplierCatalogRelations = relations(supplierCatalog, ({one, many}) => ({
	supplierPriceHistories: many(supplierPriceHistory),
	product: one(products, {
		fields: [supplierCatalog.productId],
		references: [products.id]
	}),
	supplier: one(suppliers, {
		fields: [supplierCatalog.supplierId],
		references: [suppliers.id]
	}),
}));

export const recipesRelations = relations(recipes, ({one, many}) => ({
	product: one(products, {
		fields: [recipes.productId],
		references: [products.id]
	}),
	recipeIngredients: many(recipeIngredients),
}));

export const modifierRecipeIngredientsRelations = relations(modifierRecipeIngredients, ({one}) => ({
	product: one(products, {
		fields: [modifierRecipeIngredients.ingredientId],
		references: [products.id]
	}),
	modifierRecipe: one(modifierRecipes, {
		fields: [modifierRecipeIngredients.modifierRecipeId],
		references: [modifierRecipes.id]
	}),
}));

export const modifierRecipesRelations = relations(modifierRecipes, ({many}) => ({
	modifierRecipeIngredients: many(modifierRecipeIngredients),
}));

export const productionIngredientsRelations = relations(productionIngredients, ({one}) => ({
	product: one(products, {
		fields: [productionIngredients.ingredientId],
		references: [products.id]
	}),
	production: one(productions, {
		fields: [productionIngredients.productionId],
		references: [productions.id]
	}),
}));

export const productionsRelations = relations(productions, ({one, many}) => ({
	productionIngredients: many(productionIngredients),
	product: one(products, {
		fields: [productions.productId],
		references: [products.id]
	}),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({one}) => ({
	product: one(products, {
		fields: [recipeIngredients.ingredientId],
		references: [products.id]
	}),
	recipe: one(recipes, {
		fields: [recipeIngredients.recipeId],
		references: [recipes.id]
	}),
}));

export const suppliersRelations = relations(suppliers, ({many}) => ({
	supplierCatalogs: many(supplierCatalog),
}));

export const buffetSessionsRelations = relations(buffetSessions, ({one, many}) => ({
	table: one(tables, {
		fields: [buffetSessions.tableId],
		references: [tables.id]
	}),
	buffetRounds: many(buffetRounds),
	buffetWastes: many(buffetWaste),
}));

export const tablesRelations = relations(tables, ({many}) => ({
	buffetSessions: many(buffetSessions),
}));

export const productBatchesRelations = relations(productBatches, ({one}) => ({
	albarane: one(albaranes, {
		fields: [productBatches.albaranId],
		references: [albaranes.id]
	}),
	product: one(products, {
		fields: [productBatches.productId],
		references: [products.id]
	}),
}));

export const albaranesRelations = relations(albaranes, ({many}) => ({
	productBatches: many(productBatches),
	albaranLines: many(albaranLines),
}));

export const purchaseOrderLinesRelations = relations(purchaseOrderLines, ({one}) => ({
	purchaseOrder: one(purchaseOrders, {
		fields: [purchaseOrderLines.orderId],
		references: [purchaseOrders.id]
	}),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({many}) => ({
	purchaseOrderLines: many(purchaseOrderLines),
}));

export const buffetRoundsRelations = relations(buffetRounds, ({one}) => ({
	buffetSession: one(buffetSessions, {
		fields: [buffetRounds.sessionId],
		references: [buffetSessions.id]
	}),
}));

export const buffetWasteRelations = relations(buffetWaste, ({one}) => ({
	buffetSession: one(buffetSessions, {
		fields: [buffetWaste.sessionId],
		references: [buffetSessions.id]
	}),
}));

export const albaranLinesRelations = relations(albaranLines, ({one}) => ({
	albarane: one(albaranes, {
		fields: [albaranLines.albaranId],
		references: [albaranes.id]
	}),
}));

export const productModifiersRelations = relations(productModifiers, ({one}) => ({
	modifierGroup: one(modifierGroups, {
		fields: [productModifiers.groupId],
		references: [modifierGroups.id]
	}),
}));

export const productStockRelations = relations(productStock, ({one}) => ({
	product: one(products, {
		fields: [productStock.productId],
		references: [products.id]
	}),
}));