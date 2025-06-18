export class OrderItem {
  readonly productId: string;
  quantity: number;
  price: number;

  constructor(props: { productId: string; quantity: number; price: number }) {
    this.productId = props.productId;
    this.quantity = props.quantity;
    this.price = props.price;
  }
}
