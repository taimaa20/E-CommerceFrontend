import { api } from "@/lib/api";

export enum WarehouseType {
    Main = 0,
    Sub = 1,
    Production = 2,
}

export enum InventoryTransferStatus {
    Completed = 0,
    Cancelled = 1,
}

export interface WarehouseDto {
    id: string;
    code: string;
    name: string;
    nameAr?: string | null;
    displayName: string;
    type: WarehouseType;
    isActive: boolean;
}

export interface WarehouseUpsertDto {
    code: string;
    name: string;
    nameAr?: string | null;
    type: WarehouseType;
    isActive: boolean;
}

export interface RawMaterialInventoryDto {
    id: string;
    rawMaterialId: string;
    rawMaterialName: string;
    rawMaterialNameAr?: string | null;
    warehouseId: string;
    warehouseName: string;
    warehouseNameAr?: string | null;
    warehouseCode: string;
    warehouseType: WarehouseType;
    quantity: number;
    minimumQuantity: number;
    reorderLevel: number;
    unit: string;
}

export interface RawMaterialInventoryUpsertDto {
    rawMaterialId: string;
    warehouseId: string;
    quantity: number;
    minimumQuantity: number;
    reorderLevel: number;
}

export interface InventoryTransferDto {
    id: string;
    fromWarehouseId: string;
    fromWarehouseName: string;
    toWarehouseId: string;
    toWarehouseName: string;
    rawMaterialId: string;
    rawMaterialName: string;
    rawMaterialNameAr?: string | null;
    quantity: number;
    unit: string;
    notes?: string | null;
    performedById?: string | null;
    performedByName?: string | null;
    status: InventoryTransferStatus;
    createdAt: string;
}

export interface InventoryTransferCreateDto {
    fromWarehouseId: string;
    toWarehouseId: string;
    rawMaterialId: string;
    quantity: number;
    notes?: string | null;
}

export interface StockByWarehouseRowDto {
    warehouseId: string;
    warehouseName: string;
    warehouseCode: string;
    rawMaterialId: string;
    rawMaterialName: string;
    rawMaterialNameAr?: string | null;
    unit: string;
    quantity: number;
    minimumQuantity: number;
    reorderLevel: number;
    isLow: boolean;
}

export async function listWarehouses(): Promise<WarehouseDto[]> {
    const res = await api.get<WarehouseDto[]>("/warehouses");
    return res.data ?? [];
}

export async function createWarehouse(dto: WarehouseUpsertDto): Promise<WarehouseDto> {
    const res = await api.post<WarehouseDto>("/warehouses", dto);
    return res.data as WarehouseDto;
}

export async function updateWarehouse(id: string, dto: WarehouseUpsertDto): Promise<WarehouseDto> {
    const res = await api.put<WarehouseDto>(`/warehouses/${id}`, dto);
    return res.data as WarehouseDto;
}

export async function deleteWarehouse(id: string): Promise<void> {
    await api.delete(`/warehouses/${id}`);
}

export async function listInventory(params?: { warehouseId?: string; rawMaterialId?: string }): Promise<RawMaterialInventoryDto[]> {
    const res = await api.get<RawMaterialInventoryDto[]>("/warehouses/inventory", { params });
    return res.data ?? [];
}

export async function upsertInventory(dto: RawMaterialInventoryUpsertDto): Promise<RawMaterialInventoryDto> {
    const res = await api.put<RawMaterialInventoryDto>("/warehouses/inventory", dto);
    return res.data as RawMaterialInventoryDto;
}

export async function listTransfers(params?: {
    warehouseId?: string;
    rawMaterialId?: string;
    from?: string;
    to?: string;
}): Promise<InventoryTransferDto[]> {
    const res = await api.get<InventoryTransferDto[]>("/warehouses/transfers", { params });
    return res.data ?? [];
}

export async function createTransfer(dto: InventoryTransferCreateDto): Promise<InventoryTransferDto> {
    const res = await api.post<InventoryTransferDto>("/warehouses/transfers", dto);
    return res.data as InventoryTransferDto;
}

export async function getStockByWarehouse(params?: { warehouseId?: string; lowOnly?: boolean }): Promise<StockByWarehouseRowDto[]> {
    const res = await api.get<StockByWarehouseRowDto[]>("/warehouses/reports/stock-by-warehouse", { params });
    return res.data ?? [];
}
