import { fireEvent, render, screen } from '@testing-library/react';
import { ImageWithFallback } from './ImageWithFallback';

describe('ImageWithFallback', () => {
  it('renders the original image before an error occurs', () => {
    render(<ImageWithFallback src="https://example.com/logo.png" alt="Logo" />);

    const image = screen.getByRole('img', { name: 'Logo' });
    expect(image).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('renders the fallback image after a loading error', () => {
    render(
      <ImageWithFallback
        src="https://example.com/broken.png"
        alt="Broken"
        className="preview"
      />
    );

    fireEvent.error(screen.getByRole('img', { name: 'Broken' }));

    const fallbackImage = screen.getByRole('img', { name: 'Error loading image' });
    expect(fallbackImage).toHaveAttribute('data-original-url', 'https://example.com/broken.png');
    expect(fallbackImage.closest('div.preview')).toBeInTheDocument();
  });
});
