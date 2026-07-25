import { relations } from "drizzle-orm/relations";
import { deliveryOrders, deliveryTracking, modifierGroups, modifierOptions, combos, comboSlots, products, comboSlotItems, comboItems, mealMenus, mealMenuSchedules, mealMenuCourses, productPriceRules, mealMenuCourseItems, gestoriaDocuments, gestoriaDocumentLines, supplierCatalog, supplierPriceHistory, recipes, modifierRecipeIngredients, modifierRecipes, productionIngredients, productions, recipeIngredients, suppliers, tables, buffetSessions, albaranes, productBatches, purchaseOrders, purchaseOrderLines, buffetRounds, buffetWaste, albaranLines, productModifiers, productStock } from "./schema";

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
