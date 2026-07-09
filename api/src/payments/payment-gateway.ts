export type PaymentGatewayRequest = {
  companyId: string;
  saleId: string;
  salePaymentId: string;
  method: string;
  amount: string;
};

export type PaymentGatewayResult = {
  provider: string;
  status:
    | 'manual'
    | 'pending'
    | 'authorized'
    | 'captured'
    | 'failed'
    | 'cancelled'
    | 'refunded';
  externalId?: string;
  authorizationCode?: string;
  nsu?: string;
  providerPayload?: Record<string, unknown>;
  errorMessage?: string;
};

export interface PaymentGateway {
  register(request: PaymentGatewayRequest): Promise<PaymentGatewayResult>;
}

export class ManualPaymentGateway implements PaymentGateway {
  register(request: PaymentGatewayRequest): Promise<PaymentGatewayResult> {
    return Promise.resolve({
      provider: 'manual',
      status: 'manual',
      providerPayload: {
        mode: 'manual_registry',
        method: request.method,
      },
    });
  }
}
