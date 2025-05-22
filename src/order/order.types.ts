export interface IOrder {
  orderID: string;
  orderWorth: number;
  products: {
    productID: string;
    quantity: number;
  }[];
}

export interface ISyncAttempt {
  createdAt: Date;
  status: "pending" | "finished";
}

export interface IOrderFlatten {
  orderID: string;
  orderWorth: number;
  productID: string;
  quantity: number;
}

export interface IOrderFilters {
  minWorth?: number;
  maxWorth?: number;
}

export interface IPaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
}
