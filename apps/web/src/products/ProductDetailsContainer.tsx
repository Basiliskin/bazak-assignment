import { useState } from 'react';
import { useProduct } from '../api/queries';
import { ProductDetailsDialog, type DetailsState } from '../components/ProductDetailsDialog';

interface Props {
  productId: number;
  onClose: () => void;
}

/** Fetches one Product and owns the gallery position; the dialog only renders. Key by id to reset. */
export function ProductDetailsContainer({ productId, onClose }: Props) {
  const product = useProduct(productId);
  const [imageIndex, setImageIndex] = useState(0);

  const state: DetailsState = product.data
    ? { status: 'ready', product: product.data }
    : product.isError
      ? { status: 'error', onRetry: () => void product.refetch() }
      : { status: 'loading' };

  return (
    <ProductDetailsDialog
      state={state}
      imageIndex={imageIndex}
      onSelectImage={setImageIndex}
      onClose={onClose}
    />
  );
}
