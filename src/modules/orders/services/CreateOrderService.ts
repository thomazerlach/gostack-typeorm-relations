import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Invalid customer_id.');
    }

    const foundProducts = await this.productsRepository.findAllById(products);

    if (products.length !== foundProducts.length) {
      throw new AppError('Invalid products');
    }

    const newProductsQuantity: IProduct[] = [];

    const orderProducts = foundProducts.map(foundProduct => {
      const product = products.find(it => it.id === foundProduct.id);

      if (!product) {
        throw new AppError('Invalid products');
      }

      if (product.quantity > foundProduct.quantity) {
        throw new AppError('Insufficient quantity.');
      }

      newProductsQuantity.push({
        id: foundProduct.id,
        quantity: foundProduct.quantity - product.quantity,
      });

      return {
        product_id: foundProduct.id,
        price: foundProduct.price,
        quantity: product.quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    await this.productsRepository.updateQuantity(newProductsQuantity);

    return order;
  }
}

export default CreateOrderService;
