import styled from 'styled-components';

const Loader = () => {
  return (
    <StyledWrapper>
      <div className="traffic-loader" role="status" aria-label="Loading">
        <span className="sr-only">Loading</span>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  background: #fff;

  .dark & {
    background: #0f172a;
  }

  .traffic-loader {
    width: 50px;
    height: 50px;
    --c: radial-gradient(farthest-side, #2563eb 92%, #0000);
    background: var(--c) 50% 0, var(--c) 50% 100%, var(--c) 100% 50%,
      var(--c) 0 50%;
    background-size: 10px 10px;
    background-repeat: no-repeat;
    animation: s8 1s linear infinite;
    position: relative;
  }

  .traffic-loader::before {
    content: "";
    position: absolute;
    inset: 0;
    margin: 3px;
    background: repeating-conic-gradient(#0000 0 35deg, #2563eb 0 90deg);
    -webkit-mask: radial-gradient(farthest-side, #0000 calc(100% - 3px), #000 0);
    border-radius: 50%;
  }

  @keyframes s8 {
    100% {
      transform: rotate(1turn);
    }
  }`;

export default Loader;
