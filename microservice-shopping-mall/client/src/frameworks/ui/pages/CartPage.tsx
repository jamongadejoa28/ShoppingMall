import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useCartStore } from '../../state/cartStore';
import { useAuthStore } from '../../state/authStore';
import { OrderApiAdapter } from '../../../adapters/api/OrderApiAdapter';
import { ROUTES } from '../../../shared/constants/routes';

export function CartPage() {
  const { items, removeItem, updateQuantity, clearCart } = useCartStore(
    state => state
  );
  const { isAuthenticated } = useAuthStore();

  const navigate = useNavigate();
  const totalAmount = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error('구매하려면 로그인이 필요합니다.');
      navigate(ROUTES.LOGIN);
      return;
    }
    if (items.length === 0) {
      toast.error('장바구니에 상품이 없습니다.');
      return;
    }

    const orderApi = new OrderApiAdapter();
    const orderData = {
      items: items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      shippingAddress: 'temp address',
      paymentMethod: 'credit_card',
    };

    try {
      const loadingToast = toast.loading('주문을 처리 중입니다...');
      await orderApi.createOrder(orderData);
      toast.dismiss(loadingToast);
      toast.success('주문이 성공적으로 완료되었습니다!');
      clearCart();
      navigate(ROUTES.ORDERS);
    } catch (error: any) {
      toast.error(error.message || '주문 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="container mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-6">장바구니</h1>
      {items.length === 0 ? (
        <p>장바구니에 담긴 상품이 없습니다.</p>
      ) : (
        <div>
          {items.map(item => (
            <div
              key={item.product.id}
              className="flex items-center justify-between border-b py-4"
            >
              <div className="flex items-center">
                <img
                  src={item.product.imageUrls[0]}
                  alt={item.product.name}
                  className="w-20 h-20 object-cover mr-4"
                />
                <div>
                  <h2 className="text-lg font-semibold">{item.product.name}</h2>
                  <p className="text-gray-600">
                    {item.product.price.toLocaleString()}원
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={e =>
                    updateQuantity(
                      item.product.id,
                      parseInt(e.target.value, 10)
                    )
                  }
                  className="w-16 text-center border rounded mx-4"
                  min="1"
                />
                <button
                  onClick={() => removeItem(item.product.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
          <div className="mt-6 text-right">
            <p className="text-2xl font-bold">
              총액: {totalAmount.toLocaleString()}원
            </p>
            <button
              onClick={handlePurchase}
              className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-600"
            >
              구매하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
