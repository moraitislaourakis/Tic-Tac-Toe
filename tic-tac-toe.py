import numpy as np
import random
import pickle
import os

# -----------------------------
# Tic Tac Toe Q-Learning AI
# -----------------------------

class TicTacToe:
    def __init__(self):
        self.reset()

    def reset(self):
        self.board = [' '] * 9
        self.current_winner = None
        return self.get_state()

    def get_state(self):
        # encode board as string
        return ''.join(self.board)

    def available_moves(self):
        return [i for i, x in enumerate(self.board) if x == ' ']

    def make_move(self, square, letter):
        if self.board[square] == ' ':
            self.board[square] = letter
            if self.check_winner(square, letter):
                self.current_winner = letter
            return True
        return False

    def check_winner(self, square, letter):
        # check row
        row_ind = square // 3
        row = self.board[row_ind*3:(row_ind+1)*3]
        if all([s == letter for s in row]):
            return True
        # check column
        col_ind = square % 3
        col = [self.board[col_ind+i*3] for i in range(3)]
        if all([s == letter for s in col]):
            return True
        # check diagonals
        if square % 2 == 0:
            diag1 = [self.board[i] for i in [0,4,8]]
            diag2 = [self.board[i] for i in [2,4,6]]
            if all([s == letter for s in diag1]) or all([s == letter for s in diag2]):
                return True
        return False

    def is_full(self):
        return ' ' not in self.board

    def print_board(self):
        for row in [self.board[i*3:(i+1)*3] for i in range(3)]:
            print('| ' + ' | '.join(row) + ' |')


# -----------------------------
# Q-Learning AI
# -----------------------------

class QLearningAgent:
    def __init__(self, alpha=0.3, gamma=0.9, epsilon=0.2):
        self.q_table = {}  # state -> action values
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon

    def get_qs(self, state):
        if state not in self.q_table:
            self.q_table[state] = np.zeros(9)
        return self.q_table[state]

    def choose_action(self, state, available_moves):
        # epsilon-greedy
        if random.uniform(0,1) < self.epsilon:
            return random.choice(available_moves)
        qs = self.get_qs(state)
        qs_masked = np.full(9, -np.inf)
        qs_masked[available_moves] = qs[available_moves]
        max_q = np.max(qs_masked)
        best_actions = [i for i in available_moves if qs[i] == max_q]
        return random.choice(best_actions)

    def learn(self, state, action, reward, next_state, done, available_moves_next):
        qs = self.get_qs(state)
        if done:
            target = reward
        else:
            qs_next = self.get_qs(next_state)
            if available_moves_next:
                target = reward + self.gamma * max([qs_next[a] for a in available_moves_next])
            else:
                target = reward
        qs[action] += self.alpha * (target - qs[action])
        self.q_table[state] = qs

    def save(self, filename='qtable.pkl'):
        with open(filename, 'wb') as f:
            pickle.dump(self.q_table, f)

    def load(self, filename='qtable.pkl'):
        if os.path.exists(filename):
            with open(filename, 'rb') as f:
                self.q_table = pickle.load(f)


# -----------------------------
# Training the AI
# -----------------------------

def train(agent, episodes=500000):
    env = TicTacToe()
    for ep in range(episodes):
        state = env.reset()
        done = False
        current_player = 'X'
        while not done:
            available_moves = env.available_moves()
            action = agent.choose_action(state, available_moves)
            env.make_move(action, current_player)
            next_state = env.get_state()
            done = env.current_winner is not None or env.is_full()
            reward = 0
            if done:
                if env.current_winner == 'X':
                    reward = 1 if current_player == 'X' else -1
                elif env.current_winner == 'O':
                    reward = 1 if current_player == 'O' else -1
                else:
                    reward = 0.5  # tie
            agent.learn(state, action, reward, next_state, done, env.available_moves())
            state = next_state
            current_player = 'O' if current_player == 'X' else 'X'
    agent.save()
    print("Training completed and Q-table saved!")


# -----------------------------
# Play against AI
# -----------------------------

def play_human_vs_ai(agent):
    env = TicTacToe()
    state = env.reset()
    human = ''
    while human not in ['X','O']:
        human = input("Do you want to be X or O? ").upper()
    ai_player = 'O' if human == 'X' else 'X'
    current_player = 'X'
    while True:
        env.print_board()
        if current_player == human:
            move = -1
            while move not in env.available_moves():
                try:
                    move = int(input("Your move (0-8): "))
                except:
                    continue
            env.make_move(move, human)
        else:
            move = agent.choose_action(state, env.available_moves())
            env.make_move(move, ai_player)
            print(f"AI chose: {move}")
        state = env.get_state()
        if env.current_winner:
            env.print_board()
            if env.current_winner == human:
                print("You win!")
            else:
                print("AI wins!")
            break
        elif env.is_full():
            env.print_board()
            print("It's a tie!")
            break
        current_player = 'O' if current_player == 'X' else 'X'


# -----------------------------
# Main
# -----------------------------
if __name__ == "__main__":
    agent = QLearningAgent(alpha=0.3, gamma=0.9, epsilon=0.2)
    if os.path.exists('qtable.pkl'):
        agent.load()
        print("Loaded existing Q-table.")
    else:
        print("Training AI...")
        train(agent, episodes=50000)  # train for 50k games

    print("Ready to play!")
    play_human_vs_ai(agent)
